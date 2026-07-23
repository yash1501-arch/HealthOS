import { defineConfig } from "vitest/config"
import { resolve } from "path"

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/__tests__/**/*.test.ts", "src/__tests__/**/*.test.tsx"],
    exclude: ["node_modules", ".next", ".github"],
    env: {
      JWT_SECRET: "test-jwt-secret-that-is-at-least-32-chars-long-for-testing",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/healthos_test",
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@public": resolve(__dirname, "./public"),
    },
  },
})
