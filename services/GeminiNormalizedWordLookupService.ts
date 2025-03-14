import { WordWithMeanings } from "../lib/types";
import { NormalizedWordLookupService } from "./NormalizedWordLookupService";
import dotenv from "dotenv";

dotenv.config();

export class GeminiNormalizedWordLookupService
  implements NormalizedWordLookupService
{
  private apiKey: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables");
    }
    this.apiKey = apiKey;
  }

  async lookupNormalizedWord(
    normalizedWord: string,
    existingWords?: string[],
  ): Promise<WordWithMeanings[]> {
    try {
      // Gemini API endpoint
      const url =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
      console.log("Calling Gemini");
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
                  text: (() => {
                    let promptText = `I have a Vietnamese word without diacritics: "${normalizedWord}".

Please list all possible valid Vietnamese words with diacritics that use the same base letters, along with their part of speech, meanings in English, and example usage.`;
                    
                    // Add existing words to the prompt if provided
                    if (existingWords && existingWords.length > 0) {
                      promptText += `

Here are the words I already know about: ${existingWords.join(', ')}. Please find any other words that exist. If I have all of the existent words, return an empty result.`;
                    }
                    
                    promptText += `

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
                    
                    return promptText;
                  })(),
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
      console.log("Received this response from Gemini:", JSON.stringify(data));
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
