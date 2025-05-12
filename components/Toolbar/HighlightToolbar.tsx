import { useEditorStates } from "src/state/useEditorState";
import { useUIState } from "src/useUIState";
import { schema } from "components/Blocks/TextBlock/schema";
import { TextSelection } from "prosemirror-state";
import {
  TextDecorationButton,
  toggleMarkInFocusedBlock,
} from "./TextDecorationButton";
import * as Popover from "@radix-ui/react-popover";
import * as Tooltip from "@radix-ui/react-tooltip";
import { theme } from "../../tailwind.config";
import {
  ColorPicker,
  pickers,
  SectionArrow,
  setColorAttribute,
} from "components/ThemeManager/ThemeSetter";
import { useEntity, useReplicache } from "src/replicache";
import { useEffect, useMemo, useState } from "react";
import { useColorAttribute } from "components/ThemeManager/useColorAttribute";
import { useParams } from "next/navigation";
import { rangeHasMark } from "src/utils/prosemirror/rangeHasMark";

import { Separator, ShortcutKey } from "components/Layout";
import { isMac } from "@react-aria/utils";
import { ToolbarButton } from ".";
import { NestedCardThemeProvider } from "components/ThemeManager/ThemeProvider";
import { Props } from "components/Icons/Props";
import { PopoverArrow } from "components/Icons/PopoverArrow";
import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";
import { PaintSmall } from "components/Icons/PaintSmall";

export const HighlightButton = (props: {
  lastUsedHighlight: string;
  setToolbarState: (s: "highlight") => void;
}) => {
  return (
    <div className="flex items-center gap-1">
      <TextDecorationButton
        tooltipContent={
          <div className="flex flex-col gap-1 justify-center">
            <div className="text-center bg-border-light w-fit rounded-md px-0.5 mx-auto ">
              Highlight
            </div>
            <div className="flex gap-1">
              {isMac() ? (
                <>
                  <ShortcutKey>⌘</ShortcutKey> +{" "}
                  <ShortcutKey> Ctrl </ShortcutKey> +{" "}
                  <ShortcutKey> H </ShortcutKey>
                </>
              ) : (
                <>
                  <ShortcutKey> Ctrl </ShortcutKey> +{" "}
                  <ShortcutKey> Meta </ShortcutKey> +{" "}
                  <ShortcutKey> H </ShortcutKey>
                </>
              )}
            </div>
          </div>
        }
        attrs={{ color: props.lastUsedHighlight }}
        mark={schema.marks.highlight}
        icon={
          <HighlightSmall
            highlightColor={
              props.lastUsedHighlight === "1"
                ? theme.colors["highlight-1"]
                : props.lastUsedHighlight === "2"
                  ? theme.colors["highlight-2"]
                  : theme.colors["highlight-3"]
            }
          />
        }
      />

      <ToolbarButton
        tooltipContent="Change Highlight Color"
        onClick={() => {
          props.setToolbarState("highlight");
        }}
        className="-ml-1"
      >
        <ArrowRightTiny />
      </ToolbarButton>
    </div>
  );
};

export const HighlightToolbar = (props: {
  onClose: () => void;
  lastUsedHighlight: "1" | "2" | "3";
  setLastUsedHighlight: (color: "1" | "2" | "3") => void;
  pageID: string;
}) => {
  let focusedBlock = useUIState((s) => s.focusedEntity);
  let focusedEditor = useEditorStates((s) =>
    focusedBlock ? s.editorStates[focusedBlock.entityID] : null,
  );
  let [initialRender, setInitialRender] = useState(true);
  useEffect(() => {
    setInitialRender(false);
  }, []);

  useEffect(() => {
    // we're not returning initialRender in the dependancy array on purpose! although admittedly, can't remember why not...
    if (initialRender) return;
    if (focusedEditor) props.onClose();
  }, [focusedEditor, props]);

  return (
    <div className="flex w-full justify-between items-center gap-4 text-secondary">
      <div className="flex items-center gap-[6px]">
        <HighlightColorButton
          color="1"
          lastUsedHighlight={props.lastUsedHighlight}
          setLastUsedHightlight={props.setLastUsedHighlight}
        />
        <HighlightColorButton
          color="2"
          lastUsedHighlight={props.lastUsedHighlight}
          setLastUsedHightlight={props.setLastUsedHighlight}
        />
        <HighlightColorButton
          color="3"
          lastUsedHighlight={props.lastUsedHighlight}
          setLastUsedHightlight={props.setLastUsedHighlight}
        />

        <Separator classname="h-6" />
        <HighlightColorSettings pageID={props.pageID} />
      </div>
    </div>
  );
};

export const HighlightColorButton = (props: {
  color: "1" | "2" | "3";
  lastUsedHighlight: "1" | "2" | "3";
  setLastUsedHightlight: (color: "1" | "2" | "3") => void;
}) => {
  let focusedBlock = useUIState((s) => s.focusedEntity);
  let focusedEditor = useEditorStates((s) =>
    focusedBlock ? s.editorStates[focusedBlock.entityID] : null,
  );
  let hasMark: boolean = false;
  if (focusedEditor) {
    let { to, from, $cursor } = focusedEditor.editor.selection as TextSelection;

    let mark = rangeHasMark(
      focusedEditor.editor,
      schema.marks.highlight,
      from,
      to,
    );
    if ($cursor)
      hasMark = !!schema.marks.highlight.isInSet(
        focusedEditor.editor.storedMarks || $cursor.marks(),
      );
    else {
      hasMark = !!mark;
    }
  }
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        toggleMarkInFocusedBlock(schema.marks.highlight, {
          color: props.color,
        });
        props.setLastUsedHightlight(props.color);
      }}
    >
      <div
        className={`w-6 h-6 rounded-md flex items-center justify-center ${props.lastUsedHighlight === props.color ? "bg-border" : ""}`}
      >
        <div
          className={`w-5 h-5 rounded-full border-2 border-white shadow-[0_0_0_1px_#8C8C8C]`}
          style={{
            backgroundColor:
              props.color === "1"
                ? theme.colors["highlight-1"]
                : props.color === "2"
                  ? theme.colors["highlight-2"]
                  : theme.colors["highlight-3"],
          }}
        />
      </div>
    </button>
  );
};

export const HighlightColorSettings = (props: { pageID: string }) => {
  let { rep, rootEntity } = useReplicache();
  let set = useMemo(() => {
    return setColorAttribute(rep, rootEntity);
  }, [rep, rootEntity]);

  let [openPicker, setOpenPicker] = useState<pickers>("null");

  let backgroundImage = useEntity(rootEntity, "theme/background-image");
  let backgroundRepeat = useEntity(rootEntity, "theme/background-image-repeat");
  let pageBGImage = useEntity(props.pageID, "theme/card-background-image");
  let pageBGRepeat = useEntity(
    props.pageID,
    "theme/card-background-image-repeat",
  );
  let pageBGOpacity = useEntity(
    props.pageID,
    "theme/card-background-image-opacity",
  );

  let highlight1Value = useColorAttribute(rootEntity, "theme/highlight-1");
  let highlight2Value = useColorAttribute(rootEntity, "theme/highlight-2");
  let highlight3Value = useColorAttribute(rootEntity, "theme/highlight-3");

  return (
    <Popover.Root>
      <Tooltip.Root>
        <Popover.Trigger asChild>
          <Tooltip.Trigger
            className={`rounded-md active:bg-border active:text-primary text-secondary  hover:bg-border hover:text-primary`}
            onMouseDown={(e) => {
              e.preventDefault();
            }}
          >
            <PaintSmall />
          </Tooltip.Trigger>
        </Popover.Trigger>

        <Tooltip.Portal>
          <NestedCardThemeProvider>
            <Tooltip.Content
              sideOffset={6}
              alignOffset={12}
              className="z-10 bg-border rounded-md py-1 px-[6px] font-bold text-secondary text-sm"
            >
              Change Highlight Colors
              <Tooltip.Arrow asChild width={16} height={8} viewBox="0 0 16 8">
                <PopoverArrow
                  arrowFill={theme.colors["border"]}
                  arrowStroke="transparent"
                />
              </Tooltip.Arrow>
            </Tooltip.Content>
          </NestedCardThemeProvider>
        </Tooltip.Portal>

        <Popover.Portal>
          <NestedCardThemeProvider>
            <Popover.Content
              className="themeSetterWrapper z-20 w-80 h-fit max-h-[80vh] bg-white rounded-md border border-border flex"
              align="center"
              sideOffset={8}
              collisionPadding={16}
            >
              <div
                className="bg-bg-leaflet w-full m-2 p-3 pb-0  flex flex-col rounded-md  border border-border"
                style={{
                  backgroundImage: `url(${backgroundImage?.data.src})`,
                  backgroundRepeat: backgroundRepeat ? "repeat" : "no-repeat",
                  backgroundPosition: "center",
                  backgroundSize: !backgroundRepeat
                    ? "cover"
                    : `calc(${backgroundRepeat.data.value}px / 2 )`,
                }}
              >
                <div className="flex flex-col -mb-[6px] z-10">
                  <div
                    className="themeHighlightControls flex flex-col gap-2 h-full text-primary bg-bg-leaflet p-2 rounded-md border border-primary shadow-[0_0_0_1px_rgb(var(--bg-page))]"
                    style={{ backgroundColor: "rgba(var(--bg-page), 0.6)" }}
                  >
                    <ColorPicker
                      label="Highlight 1"
                      value={highlight1Value}
                      setValue={(color) => {
                        set("theme/highlight-1")(
                          color.withChannelValue("alpha", 1),
                        );
                      }}
                      thisPicker={"highlight-1"}
                      openPicker={openPicker}
                      setOpenPicker={setOpenPicker}
                      closePicker={() => setOpenPicker("null")}
                    />
                    <ColorPicker
                      label="Highlight 2"
                      value={highlight2Value}
                      setValue={set("theme/highlight-2")}
                      thisPicker={"highlight-2"}
                      openPicker={openPicker}
                      setOpenPicker={setOpenPicker}
                      closePicker={() => setOpenPicker("null")}
                    />
                    <ColorPicker
                      label="Highlight 3"
                      value={highlight3Value}
                      setValue={set("theme/highlight-3")}
                      thisPicker={"highlight-3"}
                      openPicker={openPicker}
                      setOpenPicker={setOpenPicker}
                      closePicker={() => setOpenPicker("null")}
                    />
                  </div>
                  <SectionArrow
                    fill={theme.colors["primary"]}
                    stroke={theme.colors["bg-page"]}
                    className="ml-2"
                  />
                </div>

                <div
                  className="rounded-t-lg p-2  relative border border-border border-b-transparent shadow-md text-primary"
                  style={{
                    backgroundColor:
                      "rgba(var(--bg-page), var(--bg-page-alpha))",
                  }}
                >
                  <div
                    className="background absolute top-0 right-0 bottom-0 left-0 z-0  rounded-t-lg"
                    style={{
                      backgroundImage: `url(${pageBGImage?.data.src})`,
                      backgroundRepeat: pageBGRepeat ? "repeat" : "no-repeat",
                      backgroundPosition: "center",
                      backgroundSize: !pageBGRepeat
                        ? "cover"
                        : `calc(${pageBGRepeat.data.value}px / 2 )`,
                      opacity: pageBGOpacity?.data.value || 1,
                    }}
                  />
                  <div className="relative flex flex-col">
                    <p className="font-bold">Pick your highlights!</p>
                    <small className="">
                      This is what{" "}
                      <span className="highlight bg-highlight-1">
                        Highlights look like
                      </span>
                      <br />
                      Make them{" "}
                      <span className="highlight bg-highlight-2">
                        whatever you want!
                      </span>
                      <br />
                      <span className="highlight bg-highlight-3">
                        Happy theming!
                      </span>
                    </small>
                  </div>
                </div>
              </div>
              <Popover.Arrow asChild width={16} height={8} viewBox="0 0 16 8">
                <PopoverArrow
                  arrowFill={theme.colors["white"]}
                  arrowStroke={theme.colors["border"]}
                />
              </Popover.Arrow>
            </Popover.Content>
          </NestedCardThemeProvider>
        </Popover.Portal>
      </Tooltip.Root>
    </Popover.Root>
  );
};

const HighlightSmall = (props: { highlightColor: string } & Props) => {
  let { highlightColor, ...svgProps } = props;
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...svgProps}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M20.5 12C20.5 16.6944 16.6944 20.5 12 20.5C7.30558 20.5 3.5 16.6944 3.5 12C3.5 7.93802 6.34926 4.54153 10.1582 3.70008L9.84791 4.18297C9.77021 4.3039 9.72889 4.44461 9.72888 4.58836L9.72851 10.0094L8.63101 11.7402C8.62242 11.7538 8.61431 11.7675 8.60666 11.7815C8.60016 11.7908 8.59388 11.8004 8.58781 11.8101C8.38051 12.1418 8.46302 12.6162 8.76836 13.1359L7.24363 15.6498C6.74131 16.4779 7.3311 17.5381 8.29965 17.548L11.6224 17.5818C12.2379 17.5881 12.8114 17.2706 13.1328 16.7456L13.4985 16.148C13.9182 16.1939 14.2769 16.1567 14.5378 16.0308C14.6916 15.9756 14.8266 15.8704 14.9178 15.7265L16.0178 13.9918L20.4981 11.8165C20.4994 11.8775 20.5 11.9387 20.5 12ZM20.3169 10.2369L15.1709 12.7355C15.0456 12.7963 14.9397 12.8909 14.8651 13.0086L14.3138 13.878C14.2071 13.7494 14.0889 13.6201 13.9603 13.4913C13.554 13.0742 13.0329 12.6692 12.5492 12.3837C12.4992 12.3542 12.4466 12.3239 12.3919 12.2929C12.0663 12.101 11.7406 11.938 11.4239 11.8053C11.2273 11.719 11.024 11.6386 10.8321 11.5784C10.7486 11.5522 10.6549 11.5258 10.5563 11.505L11.1119 10.6287C11.188 10.5086 11.2285 10.3694 11.2285 10.2272L11.2289 4.80862L12.0696 3.50028C12.4231 3.50311 12.7716 3.52754 13.1136 3.57229C13.0973 3.59203 13.082 3.61297 13.0679 3.63511L12.2981 4.84369C12.2341 4.94402 12.2002 5.06052 12.2002 5.17948V7.82698C12.2002 8.17215 12.48 8.45198 12.8252 8.45198C13.1704 8.45198 13.4502 8.17215 13.4502 7.82698V5.36164L14.1222 4.3067C14.225 4.14534 14.2445 3.95474 14.1919 3.7853C17.2663 4.60351 19.6556 7.10172 20.3169 10.2369ZM22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM12.6338 9.14563C12.979 9.14563 13.2588 9.42545 13.2588 9.77063V10.2416C13.2588 10.5868 12.979 10.8666 12.6338 10.8666C12.2886 10.8666 12.0088 10.5868 12.0088 10.2416V9.77063C12.0088 9.42545 12.2886 9.14563 12.6338 9.14563ZM12.7875 14.4388C12.5032 14.1651 12.1383 13.8821 11.7882 13.6755C11.5214 13.5181 11.1621 13.3284 10.8268 13.1808C10.733 13.1395 10.6444 13.103 10.5629 13.072L8.75514 16.0525L11.6391 16.0819C11.727 16.0828 11.809 16.0374 11.8549 15.9625L12.7875 14.4388Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M20.5 12C20.5 16.6944 16.6944 20.5 12 20.5C7.30558 20.5 3.5 16.6944 3.5 12C3.5 7.93801 6.34926 4.54152 10.1582 3.70007L9.84791 4.18296C9.77021 4.30389 9.72889 4.4446 9.72888 4.58835L9.72851 10.0093L8.63101 11.7402C8.62242 11.7537 8.61431 11.7675 8.60666 11.7814C8.60016 11.7908 8.59388 11.8004 8.58781 11.8101C8.38051 12.1418 8.46302 12.6162 8.76836 13.1359L7.24363 15.6498C6.74131 16.4779 7.3311 17.5381 8.29965 17.5479L11.6224 17.5818C12.2379 17.5881 12.8114 17.2705 13.1328 16.7455L13.4985 16.148C13.9182 16.1939 14.2769 16.1567 14.5378 16.0308C14.6916 15.9756 14.8266 15.8704 14.9178 15.7265L16.0178 13.9918L20.4981 11.8164C20.4994 11.8775 20.5 11.9387 20.5 12ZM12.7875 14.4388C12.5032 14.1651 12.1383 13.8821 11.7882 13.6755C11.5214 13.5181 11.1621 13.3284 10.8268 13.1808C10.733 13.1395 10.6444 13.1029 10.5629 13.072L8.75514 16.0525L11.6391 16.0819C11.727 16.0828 11.809 16.0374 11.8549 15.9624L12.7875 14.4388Z"
        fill={highlightColor}
      />
    </svg>
  );
};
