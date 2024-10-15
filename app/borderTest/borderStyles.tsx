import { theme } from "tailwind.config";

export const borderStyles = {
  default: {
    border: `1px solid ${theme.colors.border}`,
    borderRadius: ` ${theme.borderRadius.md}`,
    backgroundColor: `${theme.colors["bg-page"]}`,
  },
  none: {},
  double: {
    border: `3px double ${theme.colors.border}`,
    borderRadius: ` ${theme.borderRadius.md}`,
    backgroundColor: `${theme.colors["bg-page"]}`,
  },

  shadow: {
    borderImageSlice: "8 fill",
    borderImageWidth: "8px",
    borderImageRepeat: "round",
    borderImageSource: "url('borders/shadowBorder.svg')",
    borderStyle: "solid",
    borderImageOutset: "0, 4px, 4px, 0",
  },

  wavy: {
    borderImageSlice: "16 fill",
    borderImageWidth: "16px",
    borderImageRepeat: "round round",
    borderImageSource: "url('borders/wavyBorder.svg')",
    borderStyle: "solid",
    borderImageOutset: "2px",
  },

  sparkle: {
    borderImageSlice: "38 81 45 20 fill",
    borderImageWidth: "38px 81px 45px 20px",
    borderImageRepeat: "round",
    borderImageSource: "url('borders/sparkleBorder.svg')",
    borderStyle: "solid",
    borderImageOutset: "12px",
  },

  animal: {
    borderImageSlice: "36 36 16 42 fill",
    borderImageWidth: "36px 36px 16px 42px",
    borderImageRepeat: "stretch",
    borderImageSource: "url('borders/animalBorder.svg')",
    borderStle: "solid",
    borderImageOutset: "22px 0px 8px 16px",
  },

  sprouts: {
    borderImageSlice: "32 36 16 36 fill",
    borderImageWidth: "32px 36px 16px 36px",
    borderImageRepeat: "stretch",
    borderImageSource: "url('borders/sproutsBorder.svg')",
    borderStle: "solid",
    borderImageOutset: "24px 0px 0px 6px",
  },

  lilGuys: {
    borderImageSlice: "8 40 28 36 fill",
    borderImageWidth: "8px 40px 28px 36px",
    borderImageRepeat: "round",
    borderImageSource: "url('borders/lilGuysBorder.svg')",
    borderStle: "solid",
    borderImageOutset: "0px 0px 12px 0px",
  },

  custom: {
    borderImage:
      "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAVCAYAAACpF6WWAAAAAXNSR0IArs4c6QAAAJFJREFUOE/NlN0KgDAIRvMh95Q+ZGEgmPm3ZdSugunhfMwERNy35gMMHWNAxKa6Sg0xTigVdxgz5wb1bCJTmZa+L9BVY+4zTSVUG1um2jCEVo21YQkavbZ84FJ8WeSN2TdQzyaL7/WZI/Xf+N5oZPGXRipbXlNQgrX/UZmhvg+H3zJkwPKWmjX0jN/b/E8Ndf8BRlGrJVcg7YAAAAAASUVORK5CYII=') 7 /  7px / 0 round",
    borderImageWidth: "7px",
    borderStyle: "solid",
    borderImageOutset: "0",

    // borderImageSlice: "33% 33% 33% 33%",
    // borderImageWidth: "1.5em 1.5em 1.5em 1.5em",
    // borderImageOutset: "12px",
    // borderImageRepeat: "round round",
    // borderImageSource:
    //   "url('https://mdn.github.io/css-examples/tools/border-image-generator/border-image-2.png')",
    // borderStyle: "solid",
  },
};
