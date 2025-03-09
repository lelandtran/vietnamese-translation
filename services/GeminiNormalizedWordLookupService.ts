
import { WordWithMeanings } from "../lib/types";
import { NormalizedWordLookupService } from "./NormalizedWordLookupService";
import dotenv from "dotenv";

dotenv.config();

export class GeminiNormalizedWordLookupService implements NormalizedWordLookupService {
  private apiKey: string;
  
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables");
    }
    this.apiKey = apiKey;
  }

  async lookupNormalizedWord(normalizedWord: string): Promise<WordWithMeanings[]> {
    try {
      // Gemini API endpoint
      const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";
      
      const response = await fetch(`${url}?key=${this.apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `I have a Vietnamese word without diacritics: "${normalizedWord}".

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
            },
          ],
          generationConfig: {
            temperature: 0.2,
          },
        }),
      });

      const data = await response.json();
      
      // Extract the content from Gemini's response format
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!content) {
        return [];
      }
      
      // Find the JSON part in the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }
      
      return JSON.parse(jsonMatch[0]) as WordWithMeanings[];
    } catch (error) {
      console.error("Error with Gemini API:", error);
      return [];
    }
  }
}
