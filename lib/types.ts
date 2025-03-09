
export type Meaning = {
  partOfSpeech: string;
  meaning: string;
  examples: string[];
};

export type WordWithMeanings = {
  word: string;
  meanings: Meaning[];
};
