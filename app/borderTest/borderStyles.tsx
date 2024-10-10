import { theme } from "tailwind.config";

export const borderStyles = {
  default: {
    border: `1px solid ${theme.colors.border}`,
    borderRadius: ` ${theme.borderRadius.md}`,
  },
  none: {},
  double: {
    border: `3px double ${theme.colors.border}`,
    borderRadius: ` ${theme.borderRadius.md}`,
  },

  shadow: {
    borderImageSlice: "8",
    borderImageWidth: "8px",
    borderImageRepeat: "round",
    borderImageSource: "url('borders/shadowBorder.svg')",
    borderStyle: "solid",
    borderImageOutset: "0, 4px, 4px, 0",
  },

  wavy: {
    borderImageSlice: "16",
    borderImageWidth: "16px",
    borderImageRepeat: "round round",
    borderImageSource: "url('borders/wavyBorder.svg')",
    borderStyle: "solid",
    borderImageOutset: "2px",
  },

  sparkle: {
    borderImageSlice: "38 81 45 20",
    borderImageWidth: "38px 81px 45px 20px",
    borderImageRepeat: "round",
    borderImageSource: "url('borders/sparkleBorder.svg')",
    borderStyle: "solid",
    borderImageOutset: "12px",
  },

  cozy: {},

  leaves: {},

  custom: {
    // borderImage:
    //   "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFQAAABUCAYAAAAcaxDBAAAAAXNSR0IArs4c6QAAAgtJREFUeF7t3MFywjAMRdHy/x/dDjNdAGF4vdVLQsJliyzbx7JIs+jla/75nqd4qwyXyWpGg38nFvTmBARdluPIZDTYCu2cxuMVbxzKpG21x4729x+M0YTt3a+Qb7Q/QZcnImi5SlcHHU1Q3uwe6dD+/3LlUcI9drzynGj/gubTEDQboYgxKEqAlnaO4Jc+z668oK8PXtDyxRB0a9CzvX4r+7F01x4qKDN7GS1oEfOaStANQP/y11N5GYdOd9cyn1WooOx8BWVeMVrQSMQC6qBne+yiLU/QUICCshsaowWNRCzgcKB0wYxjGU17PF3f7j2ULljQctMXVNB7AXol1+5RVqgVaoXeCoxuaONtk1f+5jgEXfYnKzT07LVvkA/25R9NQQWdPYl65Wd+i9GCCsoE6GMJy+7ru6lXHO+Vj0QsQFDmFaMFjUQsQFDmFaMFjUQsQFDmFaMFjUQsQFDmFaMFjUQsQFDmFaMFjUQs4PSgjGP7aPryZvc39tsTsRkFZV4xWtBIxALeHpQukG2fR6cfKbrezXsoXSAnYiMEZV4xWtBIxAIOB/puVzxxPwLT9a/eQ+mC0obX/l7QsrCgnwZa3u/m6WjLWr2Hbi5QnlBQQcsC5XS7V2h5P4dLV++hhxMoL1hQQcsC5XRWqKBlgXI6K1TQskA5XazQ8nyflc7/zlg+b0EFLQuU0/0A75zwETbnhi0AAAAASUVORK5CYII=') 28 /  28px / 0 round",
    // borderWidth: "28px",
    // borderStyle: "solid",

    borderImageSlice: "33% 33% 33% 33%",
    borderImageWidth: "1.5em 1.5em 1.5em 1.5em",
    borderImageOutset: "12px",
    borderImageRepeat: "round round",
    borderImageSource:
      "url('https://mdn.github.io/css-examples/tools/border-image-generator/border-image-2.png')",
    borderStyle: "solid",
  },
};
