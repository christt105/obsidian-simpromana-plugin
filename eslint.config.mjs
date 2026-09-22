import tseslint from "typescript-eslint";

export default tseslint.config(
	{
		ignores: ["main.js", "node_modules"],
	},
	...tseslint.configs.recommended,
	{
		files: ["src/**/*.ts"],
		rules: {
			"@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
		},
	}
);
