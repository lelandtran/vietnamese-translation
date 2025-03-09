
import { WordWithMeanings } from "../lib/types";

export interface NormalizedWordLookupService {
  lookupNormalizedWord(normalizedWord: string): Promise<WordWithMeanings[]>;
}

export class NormalizedWordLookupFactory {
  static getService(type: 'openai' | 'gemini' = 'openai'): NormalizedWordLookupService {
    switch (type) {
      case 'gemini':
        return new GeminiNormalizedWordLookupService();
      case 'openai':
      default:
        return new OpenAINormalizedWordLookupService();
    }
  }
}
