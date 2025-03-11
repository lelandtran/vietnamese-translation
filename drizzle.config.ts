import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const config = {
  schema: "./lib/schema.ts",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL ?? ""
  }
} satisfies Config;

export default config;
