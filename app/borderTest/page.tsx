import { SelectionManager } from "components/SelectionManager";
import {
  ThemeProvider,
  ThemeBackgroundProvider,
} from "components/ThemeManager/ThemeProvider";
import { PopUpProvider } from "components/Toast";
import { AddLeafletToHomepage } from "components/utils/AddLeafletToHomepage";
import { UpdateLeafletTitle } from "components/utils/UpdateLeafletTitle";

export default function BorderTest() {
  return (
    <PopUpProvider>
      <ThemeProvider entityID="123">
        <ThemeBackgroundProvider entityID="123">
          <div className="mx-auto h-screen w-fit py-12">
            <div className="flex flex-col gap-8 bg-bg-page border-border border rounded-lg h-full py-9 px-8 overflow-hidden overflow-y-scroll ">
              <Default />
              <None />
              <Double />
              <Shadow />
              <Wavy />
            </div>
          </div>
        </ThemeBackgroundProvider>
      </ThemeProvider>
    </PopUpProvider>
  );
}

const Base = (props: {
  authorClassName?: string;
  contentClassName?: string;
}) => {
  return (
    <>
      <div
        className={`
          messageAuthor
          py-0.5 px-[6px] absolute -top-3 left-2 
          text-secondary text-sm font-bold italic 
          border border-border bg-bg-page rounded-full 
          ${props.authorClassName}`}
      >
        celine
      </div>
      <div
        className={`
          messageContent
          px-4 pt-5 pb-3 w-full 
          text-sm text-primary
          ${props.contentClassName}`}
      >
        Hello! This is an example of a comment. As you can see it's pretty
        simple
      </div>
    </>
  );
};

const Default = (props: {}) => {
  return (
    <div
      className={`
        defaultMessage base relative
        w-[65ch]
        border border-border rounded-md`}
    >
      <Base />
    </div>
  );
};

const None = (props: {}) => {
  return (
    <div
      className={`
        defaultMessage relative
        w-[65ch]
       `}
    >
      <Base authorClassName="border-none" />
    </div>
  );
};

const Double = (props: {}) => {
  return (
    <div className={`doubleBorderMessage relative w-[65ch]`}>
      <div className="w-full h-full border-[3px] border-double border-border rounded-md">
        <Base />
      </div>
    </div>
  );
};

const Shadow = (props: {}) => {
  return (
    <div className={`shadowBorderMessage relative w-[65ch]`}>
      <div
        className="w-full h-full"
        style={{
          // values are top right bottom left, slice is a % and the rest are px
          borderImageSlice: "8",
          borderImageWidth: "8px",
          borderImageRepeat: "round",
          borderImageSource: "url('borders/shadowBorder.svg')",
          borderStyle: "solid",
          borderImageOutset: "0, 4px, 4px, 0",
        }}
      >
        <Base />
      </div>
    </div>
  );
};

const Wavy = (props: {}) => {
  return (
    <div className={`shadowBorderMessage relative w-[65ch]`}>
      <div
        className="w-full h-full"
        style={{
          borderImageSlice: "12 ",
          borderImageWidth: "12px",
          borderImageRepeat: "round",
          borderImageSource: "url('borders/wavyBorder.svg')",
          borderStyle: "solid",
          borderImageOutset: "6px",
        }}
      >
        <Base />
      </div>
    </div>
  );
};
