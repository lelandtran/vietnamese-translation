import { WordWithMeanings } from "../lib/types";
import { WordLookupService } from "./NormalizedWordLookupService";

export class StubNormalizedWordLookupService implements WordLookupService {

    async fromNormalizedWord(normalizedWord: string, existingWords?: string[]): Promise<WordWithMeanings[]> {
        const stubResult = (existingWords && existingWords.length > 0) ? [] : [
            {
                word: "stub",
                meanings: []
            }
        ];
        return stubResult;
    }
    
}