import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/schema.ts", // Adjust based on your project structure
  out: "./drizzle",
  driver: "pg", // Ensure this is "pg", NOT "d1-http"
  dbCredentials: {
    connectionString: process.env.DATABASE_URL, // Make sure DATABASE_URL is set in Fly.io
  },
});
