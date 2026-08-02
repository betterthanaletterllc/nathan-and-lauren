import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        gold: { DEFAULT: "#C4956A", light: "#D4A574", pale: "#E8D5C0" },
        sand: { DEFAULT: "#FAF6F1", dark: "#F2EBE2" },
        // soft/faint darkened for legibility on the sand background
        ink: { DEFAULT: "#2C2A26", soft: "#5C574F", faint: "#837C72" },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      // Site-wide legibility: "light" text renders at regular weight.
      // The airy look comes from spacing and color, not thin strokes.
      fontWeight: {
        light: "400",
      },
    },
  },
  plugins: [],
};
export default config;
