import { WordWithMeanings } from "../lib/types";
import { NormalizedWordLookupService } from "./NormalizedWordLookupService";

export class StubNormalizedWordLookupService implements NormalizedWordLookupService {

    async lookupNormalizedWord(normalizedWord: string, existingWords?: string[]): Promise<WordWithMeanings[]> {
        const stubResult = (existingWords && existingWords.length > 0) ? [] : [
            {
                word: "stub",
                meanings: []
            }
        ];
        return stubResult;
    }
    
}