import path from "path";
import { defineConfig } from "vitest/config";

// Kept separate from vite.config.ts (which owns the dev server / HMR setup) so
// running tests never touches the app's build configuration.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
