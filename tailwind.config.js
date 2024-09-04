module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    screens: {
      sm: "640px",
      md: "960px",
      lg: "1280px",
    },
    borderRadius: {
      none: "0",
      md: "0.25rem",
      lg: "0.5rem",
      full: "9999px",
    },

    colors: {
      inherit: "inherit",
      transparent: "transparent",
      current: "currentColor",

      //TEXT COLORS.
      primary: "rgb(var(--primary))",
      secondary: "color-mix(in oklab, rgb(var(--primary)), white 15%)",
      tertiary:
        "color-mix(in oklab, rgb(var(--primary)), rgb(var(--bg-card)) 55%)",
      border:
        "color-mix(in oklab, rgb(var(--primary)), rgb(var(--bg-card)) 75%)",
      "border-light":
        "color-mix(in oklab, rgb(var(--primary)), rgb(var(--bg-card)) 85%)",

      white: "#FFFFFF",

      //ACCENT COLORS
      "accent-1": "rgb(var(--accent-1))",
      "accent-2": "rgb(var(--accent-2))",
      "accent-contrast": "rgb(var(--accent-contrast))",

      //BG COLORS (defined as css variables in global.css)
      "bg-leaflet": "rgb(var(--bg-leaflet))",
      "bg-card": "rgb(var(--bg-card))",

      // HIGHLIGHT COLORS
      "highlight-1": "var(--highlight-1)",
      "highlight-2": "rgb(var(--highlight-2))",
      "highlight-3": "rgb(var(--highlight-3))",

      //DO NOT USE IN PRODUCTION. Test colors to aid development, ie, setting bg color on element to see edges of div. DO. NOT. USE. IN. PRODUCTION
      test: "#E18181",
      "test-blue": "#48D1EF",
    },
    fontSize: {
      xs: ".75rem",
      sm: ".875rem",
      base: "1rem",
      lg: "1.25rem",
      xl: "1.625rem",
      "2xl": "2rem",
    },

    extend: {
      boxShadow: {
        sm: "0.9px 1.5px 1.7px -1.8px rgba(var(--primary), 0.2), 4.2px 6.9px 7.8px -3.5px rgba(var(--primary), 0.15);",
        md: "1.2px 2.5px 2.7px -1.8px rgba(var(--primary), 0.1), 5.6px 11.6px 12.5px -3.5px rgba(var(--primary), 0.15);",
      },

      fontFamily: {
        sans: ["var(--font-quattro)"],
      },
    },
  },
  plugins: [],
};
