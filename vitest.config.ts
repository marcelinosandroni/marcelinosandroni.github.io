import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/domain/**/*.ts", "src/application/**/*.ts"],
      /**
       * Type-declaration modules are excluded because they compile to nothing:
       * v8 reports them as 0% and the global threshold can therefore never be
       * met, no matter how much behaviour is tested. Their correctness is
       * enforced by the compiler, which is the only thing that can enforce it.
       *
       * Everything with runtime behaviour stays in the gate.
       */
      exclude: [
        "src/domain/resume/types.ts",
        "src/domain/portfolio/home-content.ts",
        "**/index.ts",
      ],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
});
