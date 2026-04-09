import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        gold: { DEFAULT: "#C4956A", light: "#D4A574", pale: "#E8D5C0" },
        sand: { DEFAULT: "#FAF6F1", dark: "#F2EBE2" },
        ink: { DEFAULT: "#2C2A26", soft: "#6B6660", faint: "#9B958D" },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', "serif"],
        body: ['"Jost"', "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
