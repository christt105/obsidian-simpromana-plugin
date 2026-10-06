import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
	{
		ignores: ["main.js", "node_modules", "esbuild.config.mjs", "eslint.config.mjs", "vitest.config.*"],
	},
	...obsidianmd.configs.recommended,
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
			},
		},
	},
	{
		files: ["src/**/*.ts"],
		rules: {
			"@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
			"obsidianmd/ui/sentence-case": "off",
		},
	},
]);
