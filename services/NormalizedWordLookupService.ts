import { WordWithMeanings } from "../lib/types";
import { GeminiNormalizedWordLookupService } from "./GeminiNormalizedWordLookupService";
import { OpenAINormalizedWordLookupService } from "./OpenAINormalizedWordLookupService";

export interface WordLookupService {
  fromNormalizedWord(normalizedWord: string, existingWords?: string[]): Promise<WordWithMeanings[]>;
}

export class NormalizedWordLookupFactory {
  static getService(
    type: "openai" | "gemini" = "openai",
  ): WordLookupService {
    switch (type) {
      case "gemini":
        return new GeminiNormalizedWordLookupService();
      case "openai":
      default:
        return new OpenAINormalizedWordLookupService();
    }
  }
}
