
import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../lib/db';
import openai from '../../lib/openai';

type Meaning = {
  partOfSpeech: string;
  meaning: string;
  examples: string[];
};

type WordWithMeanings = {
  word: string;
  meanings: Meaning[];
};

type WordResponse = {
  words: WordWithMeanings[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WordResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const normalizedWord = req.query.word as string;

  if (!normalizedWord) {
    return res.status(400).json({ error: 'Word parameter is required' });
  }

  try {
    // First, check if the normalized word exists in our database
    const normalizedWordResult = await db.query(
      'SELECT id FROM normalized_words WHERE normalized_word = $1',
      [normalizedWord]
    );

    let words: WordWithMeanings[] = [];

    if (normalizedWordResult.rows.length > 0) {
      // Normalized word exists, fetch all related words and their meanings
      const normalizedId = normalizedWordResult.rows[0].id;
      
      const wordsQuery = await db.query(
        `SELECT w.id, w.word 
         FROM words w
         JOIN word_normalization wn ON w.id = wn.word_id
         WHERE wn.normalized_id = $1`,
        [normalizedId]
      );

      // Fetch meanings for each word
      for (const wordRow of wordsQuery.rows) {
        const meaningsQuery = await db.query(
          `SELECT part_of_speech, meaning, examples 
           FROM meanings 
           WHERE word_id = $1`,
          [wordRow.id]
        );

        const wordMeanings = meaningsQuery.rows.map(row => ({
          partOfSpeech: row.part_of_speech,
          meaning: row.meaning,
          examples: row.examples
        }));

        words.push({
          word: wordRow.word,
          meanings: wordMeanings
        });
      }
    } else {
      // If normalized word doesn't exist, call OpenAI
      const prompt = `I have a Vietnamese word without diacritics: "${normalizedWord}".

Please list all possible valid Vietnamese words with diacritics that use the same base letters, along with their part of speech, meanings in English, and example usage.

Format your response as a valid JSON array like this example:
[
  {
    "word": "vietnamese_word_with_diacritics",
    "meanings": [
      {
        "partOfSpeech": "part_of_speech",
        "meaning": "meaning_in_english",
        "examples": ["example1", "example2"]
      },
      {
        "partOfSpeech": "another_part_of_speech",
        "meaning": "another_meaning",
        "examples": ["example1"]
      }
    ]
  },
  {
    "word": "another_vietnamese_word_with_diacritics",
    "meanings": [
      {
        "partOfSpeech": "part_of_speech",
        "meaning": "meaning_in_english",
        "examples": ["example1"]
      }
    ]
  }
]

Only return valid JSON without any explanation or other text.`;

      const chatCompletion = await openai.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-3.5-turbo',
      });

      const content = chatCompletion.choices[0].message.content;
      
      if (content) {
        words = JSON.parse(content) as WordWithMeanings[];
        
        // Store the results in the database
        await storeInDatabase(normalizedWord, words);
      }
    }

    return res.status(200).json({ words });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'An error occurred while processing your request' });
  }
}

async function storeInDatabase(normalizedWord: string, words: WordWithMeanings[]) {
  // Start a transaction
  const client = await db.query('BEGIN');
  
  try {
    // Insert the normalized word
    const normalizedResult = await db.query(
      'INSERT INTO normalized_words (normalized_word) VALUES ($1) RETURNING id',
      [normalizedWord]
    );
    
    const normalizedId = normalizedResult.rows[0].id;
    
    // Insert each word and its meanings
    for (const wordData of words) {
      // Insert the word
      const wordResult = await db.query(
        'INSERT INTO words (word) VALUES ($1) RETURNING id',
        [wordData.word]
      );
      
      const wordId = wordResult.rows[0].id;
      
      // Create the normalization link
      await db.query(
        'INSERT INTO word_normalization (word_id, normalized_id) VALUES ($1, $2)',
        [wordId, normalizedId]
      );
      
      // Insert meanings
      for (const meaning of wordData.meanings) {
        await db.query(
          'INSERT INTO meanings (word_id, part_of_speech, meaning, examples) VALUES ($1, $2, $3, $4)',
          [wordId, meaning.partOfSpeech, meaning.meaning, meaning.examples]
        );
      }
    }
    
    // Commit the transaction
    await db.query('COMMIT');
  } catch (error) {
    // Rollback in case of error
    await db.query('ROLLBACK');
    throw error;
  }
}
