import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/node.ts"],
  clean: true,
  dts: true,
  tsconfig: "./tsconfig.json",
  format: ["esm", "cjs"],
});
