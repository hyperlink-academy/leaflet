/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    screens: {
      sm: "640px",
      md: "960px",
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

      //TEXT COLORS. # refers to lightness value. 95 = lightest, 15 = darkest
      "grey-15": "#272727",
      "grey-35": "#595959",
      "grey-55": "#8C8C8C",
      "grey-80": "#CCCCCC",
      "grey-90": "#E6E6E6",
      white: "#FFFFFF",

      //ACCENT COLORS
      "accent": "#0000FF",

      //BG COLORS
      "bg-page": "floralwhite",
      "bg-card": "white",

      //DO NOT USE IN PRODUCTION. Test colors to aid development, ie, setting bg color on element to see edges of div. DO. NOT. USE. IN. PRODUCTION
      "test": "#E18181",
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
      fontFamily: {
        sans: ['var(--font-quattro)'],
      },
    },
  },
  plugins: [],
};
