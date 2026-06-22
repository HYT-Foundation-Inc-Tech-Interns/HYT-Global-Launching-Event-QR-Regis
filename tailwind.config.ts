import type { Config } from "tailwindcss";

/**
 * Tailwind theme for HYT Digital Passport.
 * Brand palette: white background with blue, purple, and gold accents.
 * Tweak the colors below to match your event branding.
 */
const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#2563eb",
          purple: "#7c3aed",
          gold: "#d4a017",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
