import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(root, "src"),
      "@modules": path.resolve(root, "modules"),
    },
  },
  test: {
    environment: "node",
    include: ["modules/**/*.test.ts", "src/**/*.test.ts"],
  },
});
