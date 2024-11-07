import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "happy-dom",
		globals: true,
		setupFiles: ["./src/test/setup.ts"],
		coverage: {
			all: false,
			reporter: ["text", "json-summary", "json"],
			provider: "istanbul",
			thresholds: {
				lines: 60,
				branches: 50,
				functions: 60,
				statements: 60,
			},
		},
	},
});
