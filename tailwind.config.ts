import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#f7f6f2",
        ink: "#18181b",
        accent: "#0f766e",
        hot: "#ff4d2e",
        sun: "#ffd84d",
        mint: "#d9f99d",
        sky: "#38bdf8",
        soft: "#e7e5e4"
      }
    }
  },
  plugins: []
};

export default config;
