import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const integrationRun = process.argv.some((argument) =>
  argument.replaceAll("\\", "/").includes("tests/integration"),
);

if (integrationRun) {
  const fileEnvironment = loadEnv("test", projectRoot, "");
  const testDatabaseUrl = process.env.TEST_DATABASE_URL || fileEnvironment.TEST_DATABASE_URL;
  if (testDatabaseUrl) {
    // Prisma reads DATABASE_URL. Force integration runs onto the disposable URL
    // instead of relying on callers to duplicate both environment variables.
    process.env.TEST_DATABASE_URL = testDatabaseUrl;
    process.env.DATABASE_URL = testDatabaseUrl;
  }
}

export default defineConfig({
  resolve: {
    alias: {
      "@": path.join(projectRoot, "src"),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.js"],
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**", ".local/**"],
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
