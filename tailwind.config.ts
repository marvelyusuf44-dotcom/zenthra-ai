import type { Config } from "tailwindcss";

// Zenthra locked palette (BLUEPRINT.md §3). Do not add colors outside this
// system without updating the blueprint first.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "zenthra-black": "#05070A",
        "zenthra-white": "#F5F7FA",
        "zenthra-blue": "#2563EB",
        "zenthra-blue-bright": "#3B82F6",
        "zenthra-blue-soft": "#0F274D",
        "zenthra-surface": "#11161D",
        "zenthra-border": "#202731",
        "zenthra-muted": "#8B95A3",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
