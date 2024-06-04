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

      //TEXT COLORS.
      "primary" : "var(--primary)",
      "secondary": "#595959",
      "tertiary": "var(--primary)",
      "border": "#CCCCCC",
      "border-light": "#E6E6E6",

      white: "#FFFFFF",

      //ACCENT COLORS
      "accent": "var(--accent)",
      "accentText": "var(--accent-text)",


      //BG COLORS (defined as css variables in global.css)
      "bg-page": "hsb(var(--bg-page))",
      "bg-card": "var(--bg-card)",

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
      boxShadow: {

       sm:"0px 0.5px 0.5px 0.25px rgba(0, 0, 0, 0.25), 0px 2px 3px 1.5px rgba(0, 0, 0, 0.15);",
        //sm: "0px 0.5px 0.5px 0.25px rgba(0, 0, 0, 0.25), 0px 1px 2.5px 1px rgba(0, 0, 0, 0.15);",
        md: "0.5px 0.9px 1px hsl(0deg 0% 0% / 0.11), 1.1px 2.1px 2.3px -1.1px hsl(0deg 0% 0% / 0.09), 3px 5.8px 6.4px -2.3px hsl(0deg 0% 0% / 0.08), 7.8px 14.9px 16.5px -3.4px hsl(0deg 0% 0% / 0.06);"
      },

      fontFamily: {
        sans: ['var(--font-quattro)'],
      },
    },
  },
  plugins: [],
};
