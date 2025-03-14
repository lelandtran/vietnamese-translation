import { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../lib/db";
import {
  words,
  normalizedWords,
  wordNormalization,
  meanings,
} from "../../lib/schema";
import { NormalizedWordLookupFactory } from "../../services/NormalizedWordLookupService";
import { PostgresNormalizedLookupService } from "../../services/PostgresNormalizedLookupService";
import { StubNormalizedWordLookupService } from "../../services/StubNormalizedWordLookupService";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { word: normalizedWord, existingWords: existingWordsParam } = req.query;

  if (!normalizedWord || typeof normalizedWord !== "string") {
    return res.status(400).json({ error: "Normalized word is required" });
  }
  
  // Parse existingWords if provided
  let existingWords: string[] | undefined;
  if (existingWordsParam) {
    if (typeof existingWordsParam === "string") {
      existingWords = existingWordsParam.split(",").map(word => word.trim());
    } else if (Array.isArray(existingWordsParam)) {
      existingWords = existingWordsParam.map(word => word.trim());
    }
  }

  try {
    const lookupService = new PostgresNormalizedLookupService();
    // const lookupService = new StubNormalizedWordLookupService();
    const words = await lookupService.fromNormalizedWord(normalizedWord, existingWords);

    return res.status(200).json({ words });
  } catch (error) {
    console.error("Error:", error);
    return res
      .status(500)
      .json({ error: "An error occurred while processing your request" });
  }
}
