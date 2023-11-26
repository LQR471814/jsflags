import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  clean: true,
  dts: true,
  tsconfig: "./tsconfig.json",
  format: ["esm", "cjs"],
});
