
import db from '../lib/db';

async function setupDatabase() {
  try {
    console.log('Setting up database...');

    // Check if tables already exist
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'words'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('Tables already exist, skipping setup.');
      return;
    }

    // Create the tables
    await db.query(`
      create table words (
        id serial not null,
        word character varying(50) not null,
        constraint words_pkey primary key (id),
        constraint words_word_key unique (word)
      );
    `);

    await db.query(`
      create table normalized_words (
        id serial not null,
        normalized_word character varying(50) not null,
        constraint normalized_words_pkey primary key (id),
        constraint normalized_words_normalized_word_key unique (normalized_word)
      );
    `);

    await db.query(`
      create table word_normalization (
        id serial not null,
        word_id integer not null,
        normalized_id integer not null,
        constraint word_normalization_pkey primary key (id),
        constraint word_normalization_word_id_normalized_id_key unique (word_id, normalized_id),
        constraint word_normalization_normalized_id_fkey foreign KEY (normalized_id) references normalized_words (id) on delete CASCADE,
        constraint word_normalization_word_id_fkey foreign KEY (word_id) references words (id) on delete CASCADE
      );
    `);

    await db.query(`
      create table meanings (
        id serial not null,
        word_id integer not null,
        part_of_speech character varying(50) not null,
        meaning text not null,
        examples text[] null default '{}'::text[],
        constraint meanings_pkey primary key (id),
        constraint meanings_word_id_fkey foreign KEY (word_id) references words (id) on delete CASCADE
      );
    `);

    console.log('Database setup completed successfully.');
  } catch (error) {
    console.error('Error setting up database:', error);
  }
}

// Run the setup
setupDatabase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
