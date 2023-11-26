import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/*.ts"],
  clean: true,
  dts: true,
  tsconfig: "./tsconfig.json",
  format: ["esm", "cjs"],
});
