import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Palette sampled from the printed invitation suite (green + antique gold on ivory)
        gold: { DEFAULT: "#B08A4A", light: "#C19A5E", pale: "#DCCFAF", deep: "#8A6A33" },
        error: "#9C3B2A",
        sand: { DEFAULT: "#F1EBDD", dark: "#E7DFCC" },
        ink: { DEFAULT: "#244C3A", soft: "#4F7060", faint: "#7C9384" },
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
