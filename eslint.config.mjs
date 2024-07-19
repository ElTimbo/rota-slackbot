import globals from "globals";
import jest from "eslint-plugin-jest";
import pluginJs from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  {
    files: ["**/*.js"],
    languageOptions: { sourceType: "commonjs", globals: { ...globals.jest } },
    plugins: { jest },
  },
  pluginJs.configs.recommended,
  eslintConfigPrettier,
];
