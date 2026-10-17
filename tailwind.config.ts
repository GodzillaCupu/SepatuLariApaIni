import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        rotation: {
          daily: "#10b981",    // Emerald / Green (Daily Trainer)
          cushion: "#f59e0b",  // Amber / Yellow (Max Cushion)
          tempo: "#f97316",    // Orange (Tempo / Speedwork)
          race: "#ef4444",     // Red (Race Day / Super Shoe)
          trail: "#8b5cf6",    // Purple / Indigo (Trail)
        },
      },
    },
  },
  plugins: [],
};
export default config;
