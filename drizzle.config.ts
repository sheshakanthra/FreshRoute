import { defineConfig } from "drizzle-kit";
import * as fs from "node:fs";
import * as path from "node:path";

// Loaded here (rather than via a dotenv dependency) so drizzle-kit's CLI
// commands (generate/migrate/studio) see DATABASE_URL without adding a new
// runtime dependency just for this.
const envPath = path.resolve(__dirname, ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set (checked process.env and .env)");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
