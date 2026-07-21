import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "/HOBT/",
  root: rootDir,
  resolve: {
    alias: {
      "@hobt/lego-skirmish": path.resolve(rootDir, "../src"),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    outDir: path.resolve(rootDir, "dist"),
    emptyOutDir: true,
  },
});
