import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "#0b1326",
        "surface-dim": "#0b1326",
        "surface-bright": "#31394d",
        "surface-container-lowest": "#060e20",
        "surface-container-low": "#131b2e",
        "surface-container": "#171f33",
        "surface-container-high": "#222a3d",
        "surface-container-highest": "#2d3449",
        "surface-variant": "#2d3449",
        primary: "#d0bcff",
        "primary-container": "#7b4be5",
        secondary: "#b9c7e0",
        tertiary: "#4edea3",
        "tertiary-fixed": "#6ffbbe",
        "tertiary-container": "#007b54",
        danger: "#ff4d4d",
        outline: "#968da0",
        "outline-variant": "#4a4454",
        "on-surface": "#dae2fd",
        "on-surface-variant": "#ccc3d7",
        "on-primary": "#3c0091",
        "on-primary-container": "#f4ebff"
      },
      fontFamily: {
        headline: ["Space Grotesk", "Inter", "Segoe UI", "sans-serif"],
        body: ["Inter", "Segoe UI", "sans-serif"],
        label: ["Inter", "Segoe UI", "sans-serif"],
      },
      backgroundImage: {
        "proof-gradient": "linear-gradient(135deg, #d0bcff 0%, #7b4be5 100%)",
      },
      boxShadow: {
        glow: "0 0 32px rgba(208, 188, 255, 0.24)",
        emerald: "0 0 24px rgba(78, 222, 163, 0.24)",
      },
      letterSpacing: {
        serial: "0.2em",
      },
      borderRadius: {
        soft: "0.375rem",
      },
    },
  },
  plugins: [],
};

export default config;
