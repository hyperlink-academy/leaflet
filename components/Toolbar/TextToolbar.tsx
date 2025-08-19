import { Separator, ShortcutKey } from "components/Layout";
import { metaKey } from "src/utils/metaKey";
import { LinkButton } from "./InlineLinkToolbar";
import { ListButton } from "./ListToolbar";
import { TextBlockTypeButton } from "./TextBlockTypeToolbar";
import { TextDecorationButton } from "./TextDecorationButton";
import { HighlightButton } from "./HighlightToolbar";
import { ToolbarTypes } from ".";
import { schema } from "components/Blocks/TextBlock/schema";
import { TextAlignmentButton } from "./TextAlignmentToolbar";
import { LockBlockButton } from "./LockBlockButton";
import { Props } from "components/Icons/Props";
import { isMac } from "src/utils/isDevice";

export const TextToolbar = (props: {
  lastUsedHighlight: string;
  setToolbarState: (s: ToolbarTypes) => void;
}) => {
  return (
    <>
      <TextDecorationButton
        tooltipContent={
          <div className="flex flex-col gap-1 justify-center">
            <div className="text-center">Bold </div>
            <div className="flex gap-1">
              <ShortcutKey>{metaKey()}</ShortcutKey> +{" "}
              <ShortcutKey> B </ShortcutKey>
            </div>
          </div>
        }
        mark={schema.marks.strong}
        icon={<BoldSmall />}
      />
      <TextDecorationButton
        tooltipContent={
          <div className="flex flex-col gap-1 justify-center">
            <div className="italic font-normal text-center">Italic</div>
            <div className="flex gap-1">
              <ShortcutKey>{metaKey()}</ShortcutKey> +{" "}
              <ShortcutKey> I </ShortcutKey>
            </div>
          </div>
        }
        mark={schema.marks.em}
        icon={<ItalicSmall />}
      />
      <TextDecorationButton
        tooltipContent={
          <div className="flex flex-col gap-1 justify-center">
            <div className="text-center font-normal line-through">
              Strikethrough
            </div>
            <div className="flex gap-1">
              {isMac() ? (
                <>
                  <ShortcutKey>⌘</ShortcutKey> +{" "}
                  <ShortcutKey> Ctrl </ShortcutKey> +{" "}
                  <ShortcutKey> X </ShortcutKey>
                </>
              ) : (
                <>
                  <ShortcutKey> Ctrl </ShortcutKey> +{" "}
                  <ShortcutKey> Meta </ShortcutKey> +{" "}
                  <ShortcutKey> X </ShortcutKey>
                </>
              )}
            </div>
          </div>
        }
        mark={schema.marks.strikethrough}
        icon={<StrikethroughSmall />}
      />
      <HighlightButton
        lastUsedHighlight={props.lastUsedHighlight}
        setToolbarState={props.setToolbarState}
      />
      <Separator classname="h-6" />
      <LinkButton setToolbarState={props.setToolbarState} />
      <Separator classname="h-6" />
      <TextBlockTypeButton setToolbarState={props.setToolbarState} />
      <TextAlignmentButton setToolbarState={props.setToolbarState} />
      <ListButton setToolbarState={props.setToolbarState} />
      <Separator classname="h-6" />

      <LockBlockButton />
    </>
  );
};

export const ItalicSmall = (props: Props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M16.5405 4.29297H8.94642C8.84899 4.29297 8.76575 4.36316 8.74929 4.45919L8.47218 6.07615C8.45124 6.19833 8.54535 6.30993 8.66931 6.30993H11.1682C11.2917 6.30993 11.3856 6.42064 11.3656 6.54243L9.55711 17.5225C9.5412 17.6191 9.45768 17.69 9.35977 17.69H6.73484C6.63743 17.69 6.55419 17.7602 6.53772 17.8562L6.26156 19.4656C6.24059 19.5877 6.3347 19.6994 6.45868 19.6994H14.0711C14.1686 19.6994 14.2519 19.6291 14.2682 19.5329L14.542 17.9236C14.5628 17.8014 14.4687 17.69 14.3449 17.69H11.8282C11.7047 17.69 11.6107 17.5792 11.6308 17.4574L13.445 6.47733C13.4609 6.38076 13.5444 6.30993 13.6423 6.30993H16.2664C16.364 6.30993 16.4473 6.23954 16.4636 6.14335L16.7377 4.52639C16.7584 4.40432 16.6643 4.29297 16.5405 4.29297Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const StrikethroughSmall = (props: Props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14.766 7.54791C14.5981 7.14401 14.3193 6.81106 13.9296 6.54904C13.3392 6.14693 12.596 5.94588 11.7002 5.94588C11.0588 5.94588 10.504 6.04768 10.0358 6.25128C9.56749 6.44978 9.20356 6.72464 8.94397 7.07585C8.68947 7.42197 8.56222 7.81644 8.56222 8.25927C8.56222 8.63083 8.64875 8.9515 8.82181 9.22127C8.99996 9.49104 9.23155 9.71754 9.51659 9.90078C9.80672 10.0789 10.1172 10.2291 10.4481 10.3512C10.7789 10.4683 11.097 10.565 11.4024 10.6414L11.7916 10.7426H19.1828C19.2933 10.7426 19.3828 10.8321 19.3828 10.9426V12.2426C19.3828 12.353 19.2933 12.4426 19.1828 12.4426H4.2C4.08954 12.4426 4 12.353 4 12.2426V10.9426C4 10.8321 4.08954 10.7426 4.2 10.7426H7.02679C6.4827 10.1204 6.21066 9.33845 6.21066 8.3967C6.21066 7.49577 6.45498 6.70937 6.94361 6.0375C7.43225 5.36562 8.09394 4.8439 8.9287 4.47233C9.76345 4.09568 10.7051 3.90735 11.7536 3.90735C12.8123 3.90735 13.7463 4.09313 14.5557 4.4647C15.37 4.83627 16.0114 5.34781 16.4797 5.99932C16.6189 6.19157 16.7384 6.39238 16.838 6.60174C17.1675 7.34647 16.7266 7.9669 16.2546 8.14575C15.7343 8.34291 15.0571 8.17629 14.766 7.54791ZM17.0153 13.9178C17.0957 13.9178 17.1689 13.9658 17.197 14.0412C17.3499 14.452 17.4264 14.9169 17.4264 15.4361C17.4264 16.3218 17.1973 17.1082 16.7392 17.7953C16.2862 18.4825 15.6271 19.0245 14.7618 19.4216C13.9016 19.8186 12.8607 20.0171 11.6391 20.0171C10.4684 20.0171 9.45551 19.8313 8.60039 19.4597C7.74528 19.0882 7.07595 18.5613 6.59241 17.8793C6.40641 17.615 6.25242 17.3318 6.13043 17.0299C5.85043 16.3373 6.2981 15.6726 6.89251 15.4915C7.42606 15.329 8.08749 15.585 8.32635 16.2052C8.41821 16.4437 8.54519 16.6582 8.70728 16.8486C9.03304 17.2201 9.44787 17.4975 9.95178 17.6808C10.4608 17.8589 11.0181 17.948 11.6238 17.948C12.2906 17.948 12.8836 17.8437 13.4028 17.635C13.927 17.4212 14.3393 17.126 14.6396 16.7493C14.9399 16.3676 15.0901 15.9222 15.0901 15.4132C15.0901 14.95 14.9578 14.5708 14.6931 14.2756C14.6436 14.2193 14.5906 14.1649 14.5343 14.1123C14.4636 14.0463 14.5077 13.9178 14.6044 13.9178H17.0153Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const BoldSmall = (props: Props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.50664 19.6364L7.50448 19.6364H6.2C6.08954 19.6364 6 19.5468 6 19.4364V17.836C6 17.7255 6.08954 17.636 6.2 17.636H7.30664V6.00037H6.2C6.08954 6.00037 6 5.91082 6 5.80037V4.2C6 4.08954 6.08954 4 6.2 4H7.50664H10.1779H13.0328C14.1425 4 14.9085 4.18324 15.6364 4.54972C16.3642 4.9111 16.9089 5.40228 17.2702 6.02326C17.6316 6.63915 17.8123 7.23894 17.8123 8.01261C17.8123 8.66413 17.6927 9.07855 17.4535 9.52647C17.3043 9.80578 17.0377 10.2195 16.6682 10.5116C16.3158 10.7902 15.8543 11.0303 15.3972 11.1579C15.3583 11.1688 15.331 11.2039 15.331 11.2442C15.331 11.2913 15.3679 11.33 15.4149 11.3337C15.9048 11.3723 16.3832 11.5385 16.8503 11.8322C17.3491 12.1376 17.7614 12.5728 18.0872 13.1378C18.4129 13.7028 18.5758 14.6202 18.5758 15.4295C18.5758 16.2286 18.3875 16.9463 18.0108 17.5826C17.6393 18.2137 17.0641 18.7151 16.2853 19.0866C15.5066 19.4531 14.5115 19.6364 13.3001 19.6364H7.50664ZM9.66584 17.4131C9.66584 17.5236 9.75538 17.6131 9.86584 17.6131H13.071C14.201 17.6131 15.0103 17.3942 15.4989 16.9565C15.9876 16.5188 16.2319 15.9716 16.2319 15.315C16.2319 14.8213 16.1072 14.138 15.8578 13.7257C15.6084 13.3134 15.2521 12.9851 14.7889 12.7408C14.3308 12.4965 13.7862 12.3743 13.155 12.3743H9.86584C9.75538 12.3743 9.66584 12.4638 9.66584 12.5743V17.4131ZM9.66584 10.3343C9.66584 10.4447 9.75538 10.5343 9.86584 10.5343H12.8267C13.3561 10.5343 13.6793 10.4325 14.1017 10.2289C14.5293 10.0253 14.8678 9.74025 15.1172 9.37377C15.3717 9.0022 15.4989 8.69976 15.4989 8.19585C15.4989 7.54943 15.2724 7.10233 14.8194 6.6646C14.3664 6.22686 13.8243 6.00799 12.8878 6.00799H9.86584C9.75538 6.00799 9.66584 6.09753 9.66584 6.20799V10.3343Z"
        fill="currentColor"
      />
    </svg>
  );
};
