import { WordWithMeanings } from "../lib/types";
import { NormalizedWordLookupService } from "./NormalizedWordLookupService";
import { db } from "../lib/db";
import {
  words,
  normalizedWords,
  wordNormalization,
  meanings,
} from "../lib/schema";
import { eq } from "drizzle-orm";
import { NormalizedWordLookupFactory } from "./NormalizedWordLookupService";

export class PostgresNormalizedLookupService
  implements NormalizedWordLookupService
{
  async lookupNormalizedWord(
    normalizedWord: string,
  ): Promise<WordWithMeanings[]> {
    let results: WordWithMeanings[] = [];

    // Check if the normalized word exists in the database
    const normalizedWordResult = await db
      .select()
      .from(normalizedWords)
      .where(eq(normalizedWords.normalizedWord, normalizedWord.toLowerCase()))
      .limit(1);

    if (normalizedWordResult.length > 0) {
      const normalizedId = normalizedWordResult[0].id;

      const wordLinks = await db
        .select()
        .from(wordNormalization)
        .where(eq(wordNormalization.normalizedId, normalizedId));

      const wordIds = wordLinks.map((link) => link.wordId);

      for (const wordId of wordIds) {
        const wordResult = await db
          .select()
          .from(words)
          .where(eq(words.id, wordId))
          .limit(1);

        if (wordResult.length > 0) {
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
      }
    } else {
      // If not found, fall back to Gemini lookup
      const thirdPartyLookupService =
        NormalizedWordLookupFactory.getService("gemini");
      results =
        await thirdPartyLookupService.lookupNormalizedWord(normalizedWord);

      // Prepare upsert data for batch insertion
      const normalizedWordUpsertData = {
        normalizedWord: normalizedWord.toLowerCase(),
      };

      const wordsUpsertData = results.map((res) => ({
        word: res.word,
      }));

      const meaningsUpsertData = results.flatMap((res) =>
        res.meanings.map((meaning) => ({
          word: res.word,
          partOfSpeech: meaning.partOfSpeech,
          meaning: meaning.meaning,
          examples: meaning.examples || [],
        })),
      );

      // Perform a batch upsert for normalizedWords
      await db
        .insert(normalizedWords)
        .values(normalizedWordUpsertData)
        .onConflictDoNothing()
        .returning();

      // Batch insert words and meanings together
      const wordIdResults = await db
        .insert(words)
        .values(wordsUpsertData)
        .onConflictDoNothing()
        .returning();

      const wordIdMap = new Map(
        wordIdResults.map((r, index) => [r.word, r.id]),
      );

      for (const meaning of meaningsUpsertData) {
        const wordId = wordIdMap.get(meaning.word);
        if (wordId) {
          await db
            .insert(meanings)
            .values({
              wordId,
              partOfSpeech: meaning.partOfSpeech,
              meaning: meaning.meaning,
              examples: meaning.examples,
            })
            .onConflictDoNothing();
        }
      }

      // Link new words to their normalized word
      const newNormalizedWordIdResult = await db
        .select()
        .from(normalizedWords)
        .where(
          eq(normalizedWords.normalizedWord, normalizedWord.toLowerCase()),
        );
      const newNormalizedId = newNormalizedWordIdResult.length
        ? newNormalizedWordIdResult[0].id
        : null;

      if (newNormalizedId) {
        const upsertLinks = wordIdResults.map((word) => ({
          wordId: word.id,
          normalizedId: newNormalizedId,
        }));
        await db
          .insert(wordNormalization)
          .values(upsertLinks)
          .onConflictDoNothing();
      }
    }

    return results;
  }
}
