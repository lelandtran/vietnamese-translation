
import { WordWithMeanings } from "../lib/types";
import { NormalizedWordLookupService } from "./NormalizedWordLookupService";
import openai from "../lib/openai";

export class OpenAINormalizedWordLookupService implements NormalizedWordLookupService {
  async lookupNormalizedWord(normalizedWord: string, existingWords?: string[]): Promise<WordWithMeanings[]> {
    let promptContent = `I have a Vietnamese word without diacritics: "${normalizedWord}".

Please list all possible valid Vietnamese words with diacritics that use the same base letters, along with their part of speech, meanings in English, and example usage.`;
    
    // Add existing words to the prompt if provided
    if (existingWords && existingWords.length > 0) {
      promptContent += `

Here are the words I already know about: ${existingWords.join(', ')}. Please find any other words that exist. If I have all of the existent words, return an empty result.`;
    }
    
    promptContent += `

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
      messages: [
        {
          role: "user",
          content: promptContent
        }
      ],
      model: "gpt-3.5-turbo",
    });

    const content = chatCompletion.choices[0].message.content;
    
    if (!content) {
      return [];
    }
    
    return JSON.parse(content) as WordWithMeanings[];
  }
}
