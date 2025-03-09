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
    const lookupService = new PostgresNormalizedLookupService();
    const words = await lookupService.lookupNormalizedWord(normalizedWord);

    return res.status(200).json({ words });
  } catch (error) {
    console.error("Error:", error);
    return res
      .status(500)
      .json({ error: "An error occurred while processing your request" });
  }
}
