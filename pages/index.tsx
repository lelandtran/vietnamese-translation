import { useState } from 'react';
import Head from 'next/head';
import styles from '../styles/Home.module.css';

type Meaning = {
  partOfSpeech: string;
  meaning: string;
  examples: string[];
};

type WordWithMeanings = {
  word: string;
  meanings: Meaning[];
};

export default function Home() {
  const [normalizedWord, setNormalizedWord] = useState('');
  const [results, setResults] = useState<WordWithMeanings[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [service, setService] = useState('openai'); // Added state for service selection

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!normalizedWord) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/lookup?word=${encodeURIComponent(normalizedWord)}&service=${service}`);
      const data = await response.json();

      if (response.ok) {
        setResults(data.words);
      } else {
        setError(data.error || 'An error occurred');
      }
    } catch (err) {
      setError('Failed to fetch results');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Vietnamese Word Lookup</title>
        <meta name="description" content="Learn Vietnamese through reverse word lookup" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Vietnamese Word Lookup</h1>

        <p className={styles.description}>
          Enter a Vietnamese word without diacritics to see all possible words with diacritics
        </p>

        <form onSubmit={handleSearch} className={styles.searchForm}>
          <div className={styles.inputGroup}>
            <input
              type="text"
              value={normalizedWord}
              onChange={(e) => setNormalizedWord(e.target.value)}
              placeholder="Enter Vietnamese word without diacritics"
              className={styles.searchInput}
            />
            <select 
              value={service}
              onChange={(e) => setService(e.target.value)}
              className={styles.serviceSelect}
            >
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini Pro</option>
            </select>
          </div>
          <button 
            type="submit" 
            className={styles.searchButton}
            disabled={loading || !normalizedWord}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {error && <div className={styles.error}>{error}</div>}

        {results.length > 0 && (
          <div className={styles.results}>
            {results.map((wordData, wordIndex) => (
              <div key={wordIndex} className={styles.wordCard}>
                <h2 className={styles.word}>{wordData.word}</h2>

                {wordData.meanings.map((meaning, meaningIndex) => (
                  <div key={meaningIndex} className={styles.meaning}>
                    <div className={styles.partOfSpeech}>{meaning.partOfSpeech}</div>
                    <div className={styles.definition}>{meaning.meaning}</div>

                    {meaning.examples.length > 0 && (
                      <div className={styles.examples}>
                        <h4>Examples:</h4>
                        <ul>
                          {meaning.examples.map((example, exampleIndex) => (
                            <li key={exampleIndex}>{example}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}