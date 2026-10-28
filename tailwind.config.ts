import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F4F6F8",
        surface: "#FFFFFF",
        hairline: "#DBE2E8",
        ink: "#101828",
        muted: "#64748B",
        // "steel" keeps its name for zero-touch cascade across every
        // page already using bg-steel-*/text-steel-* — redefined here as
        // a brick-terracotta scale sampled from the Ideal Brique logo,
        // now the app's primary interactive color (links, buttons).
        steel: {
          50: "#FFF1ED",
          100: "#FFDCD2",
          400: "#F07A5C",
          600: "#E65A3B",
          700: "#C9462C",
          900: "#7F2E1C",
        },
        // Dark charcoal matching the logo's swoosh — used specifically
        // for the sidebar background, distinct from the terracotta
        // accent so structure and action stay visually separate.
        graphite: {
          800: "#1C2835",
          900: "#101828",
        },
        // Deep green — a confident, contrasting accent for primary
        // create/save actions, set apart from the terracotta nav color.
        safety: {
          DEFAULT: "#247A63",
          light: "#D9F0E9",
        },
        urgent: "#C83D45",
        moyenne: "#D58A1F",
        faible: "#247A63",
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "2px",
        DEFAULT: "3px",
        md: "4px",
      },
    },
  },
  plugins: [],
};
export default config;
