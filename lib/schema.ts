
import { pgTable, serial, text, varchar, integer, unique, primaryKey } from 'drizzle-orm/pg-core';

// Words table
export const words = pgTable('words', {
  id: serial('id').primaryKey(),
  word: varchar('word', { length: 50 }).notNull().unique()
});

// Normalized words table
export const normalizedWords = pgTable('normalized_words', {
  id: serial('id').primaryKey(),
  normalizedWord: varchar('normalized_word', { length: 50 }).notNull().unique()
});

// Word normalization link table
export const wordNormalization = pgTable('word_normalization', {
  id: serial('id').primaryKey(),
  wordId: integer('word_id').notNull().references(() => words.id, { onDelete: 'cascade' }),
  normalizedId: integer('normalized_id').notNull().references(() => normalizedWords.id, { onDelete: 'cascade' })
}, (table) => {
  return {
    wordNormalizedUnique: unique().on(table.wordId, table.normalizedId)
  };
});

// Meanings table
export const meanings = pgTable('meanings', {
  id: serial('id').primaryKey(),
  wordId: integer('word_id').notNull().references(() => words.id, { onDelete: 'cascade' }),
  partOfSpeech: varchar('part_of_speech', { length: 50 }).notNull(),
  meaning: text('meaning').notNull(),
  examples: text('examples').array().default([])
});
