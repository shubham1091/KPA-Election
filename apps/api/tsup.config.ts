import { defineConfig, type Options } from "tsup";

export default defineConfig((options: Options) => ({
  entry: ["src/index.ts", "src/server.ts"],
  clean: true,
  format: ["cjs"],
  outExtension: () => ({ js: ".cjs" }),
  ...options,
}));
