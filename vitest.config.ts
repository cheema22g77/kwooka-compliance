import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@/core": path.resolve(__dirname, "src/core"),
      "@/ports": path.resolve(__dirname, "src/ports"),
      "@/events": path.resolve(__dirname, "src/events"),
      "@/agents": path.resolve(__dirname, "src/agents"),
      "@/guardrails": path.resolve(__dirname, "src/guardrails"),
      "@/lib": path.resolve(__dirname, "src/lib"),
      "@/memory": path.resolve(__dirname, "src/memory"),
      "@/intelligence": path.resolve(__dirname, "src/intelligence"),
      "@": path.resolve(__dirname, "src"),
    },
  },
});
