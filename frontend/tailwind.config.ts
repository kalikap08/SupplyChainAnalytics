import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#08152B",
          900: "#0B1E3D",
          800: "#122A52",
          700: "#1B3A6B",
          600: "#274C87",
        },
        surface: {
          DEFAULT: "#F3F6FB",
          card: "#FFFFFF",
          border: "#E4E9F2",
        },
        ink: {
          900: "#0F172A",
          600: "#475467",
          400: "#8896AB",
        },
        accent: {
          blue: "#2563EB",
          emerald: "#0D9488",
          violet: "#7C3AED",
          amber: "#B45309",
          cyan: "#0E7490",
          rose: "#BE123C",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "system-ui",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 12px rgba(15, 23, 42, 0.05)",
        cardHover: "0 4px 20px rgba(15, 23, 42, 0.08)",
      },
      borderRadius: {
        xl2: "1rem",
      },
    },
  },
  plugins: [],
};
export default config;
