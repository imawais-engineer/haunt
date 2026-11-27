import { defineConfig } from "vitest/config";

// GitHub Pages serves the project page from /haunt/. `vite build` and `vite preview`
// use that base (override with BASE_PATH); the dev server and tests stay at "/".
declare const process: { env: Record<string, string | undefined> };

export default defineConfig(({ command, isPreview }) => ({
  base: process.env.BASE_PATH ?? (command === "build" || isPreview ? "/haunt/" : "/"),
  test: {
    include: ["tests/**/*.test.ts"],
  },
}));
