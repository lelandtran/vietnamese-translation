import { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../lib/db";
import openai from "../../lib/openai";
import {
  words,
  normalizedWords,
  wordNormalization,
  meanings,
} from "../../lib/schema";
import { eq, and } from "drizzle-orm";
import { WordWithMeanings } from "../../lib/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { word: normalizedWord } = req.query;

  if (!normalizedWord || typeof normalizedWord !== "string") {
    return res.status(400).json({ error: "Normalized word is required" });
  }

  try {
    // Check if the normalized word exists in our database
    const normalizedWordResult = await db
      .select()
      .from(normalizedWords)
      .where(eq(normalizedWords.normalizedWord, normalizedWord.toLowerCase()))
      .limit(1);

    let words: WordWithMeanings[] = [];

    if (normalizedWordResult.length > 0) {
      // Get the normalized word ID
      const normalizedId = normalizedWordResult[0].id;

      // Get all words linked to this normalized word
      const wordLinks = await db
        .select({
          wordId: wordNormalization.wordId,
        })
        .from(wordNormalization)
        .where(eq(wordNormalization.normalizedId, normalizedId));

      const wordIds = wordLinks.map((link) => link.wordId);

      // Build the results
      const results: WordWithMeanings[] = [];

      for (const wordId of wordIds) {
        // Get the word
        const wordResult = await db
          .select()
          .from(words)
          .where(eq(words.id, wordId))
          .limit(1);

        if (wordResult.length === 0) continue;

        // Get all meanings for this word
        const meaningResults = await db
          .select()
          .from(meanings)
          .where(eq(meanings.wordId, wordId));

        results.push({
          word: wordResult[0].word,
          meanings: meaningResults.map((m) => ({
            partOfSpeech: m.partOfSpeech,
            meaning: m.meaning,
            examples: m.examples || [],
          })),
        });
      }

      words = results;
    } else {
      // If not found, call OpenAI API
      const chatCompletion = await openai.chat.completions.create({
        messages: [
          {
            role: "user",
            content: `I have a Vietnamese word without diacritics: "${normalizedWord}".

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

Only return valid JSON without any explanation or other text.`,
          },
        ],
        model: "gpt-3.5-turbo",
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
    console.error("Error:", error);
    return res
      .status(500)
      .json({ error: "An error occurred while processing your request" });
  }
}

async function storeInDatabase(
  normalizedWord: string,
  wordsData: WordWithMeanings[],
) {
  try {
    // Insert the normalized word
    const [normalizedResult] = await db
      .insert(normalizedWords)
      .values({ normalizedWord: normalizedWord.toLowerCase() })
      .returning();

    const normalizedId = normalizedResult.id;

    // Insert each word and its meanings
    for (const wordData of wordsData) {
      // Insert the word
      const [wordResult] = await db
        .insert(words)
        .values({ word: wordData.word })
        .returning();

      const wordId = wordResult.id;

      // Create the normalization link
      await db.insert(wordNormalization).values({ wordId, normalizedId });

      // Insert meanings
      for (const meaning of wordData.meanings) {
        await db.insert(meanings).values({
          wordId,
          partOfSpeech: meaning.partOfSpeech,
          meaning: meaning.meaning,
          examples: meaning.examples,
        });
      }
    }
  } catch (error) {
    console.error("Error storing in database:", error);
    throw error;
  }
}
