import { defineConfig } from "drizzle-kit";
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
export default defineConfig({
  dialect: "postgresql", // "mysql" | "sqlite" | "postgresql"
  schema: "./src/schema/*",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DB_URL as string,
  },
});
