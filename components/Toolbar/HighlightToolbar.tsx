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
import {
  ArrowRightTiny,
  HighlightSmall,
  PaintSmall,
  PopoverArrow,
} from "components/Icons";
import { Separator, ShortcutKey } from "components/Layout";
import { isMac } from "@react-aria/utils";
import { ToolbarButton } from ".";

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
}) => {
  let focusedBlock = useUIState((s) => s.focusedBlock);
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
        <HighlightColorSettings />
      </div>
    </div>
  );
};

export const HighlightColorButton = (props: {
  color: "1" | "2" | "3";
  lastUsedHighlight: "1" | "2" | "3";
  setLastUsedHightlight: (color: "1" | "2" | "3") => void;
}) => {
  let focusedBlock = useUIState((s) => s.focusedBlock);
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

export const HighlightColorSettings = () => {
  let { rep, rootEntity } = useReplicache();
  let params = useParams();
  let set = useMemo(() => {
    return setColorAttribute(rep, rootEntity);
  }, [rep, rootEntity]);

  let [openPicker, setOpenPicker] = useState<pickers>("null");

  let backgroundImage = useEntity(rootEntity, "theme/background-image");
  let backgroundRepeat = useEntity(rootEntity, "theme/background-image-repeat");

  let color = useEntity(rootEntity, "theme/highlight-1");
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
        </Tooltip.Portal>

        <Popover.Portal>
          <Popover.Content
            className="themeSetterWrapper z-20 w-80 h-fit max-h-[80vh] bg-white rounded-md border border-border flex"
            align="center"
            sideOffset={8}
            collisionPadding={16}
          >
            <div
              className="bg-bg-page w-full m-2 p-3 pb-0  flex flex-col rounded-md  border border-border"
              style={{
                backgroundImage: `url(${backgroundImage?.data.src})`,
                backgroundRepeat: backgroundRepeat ? "repeat" : "no-repeat",
                backgroundSize: !backgroundRepeat
                  ? "cover"
                  : `calc(${backgroundRepeat.data.value}px / 2 )`,
              }}
            >
              <div className="flex flex-col -mb-[6px] z-10">
                <div
                  className="themeHighlightControls flex flex-col gap-2 h-full text-primary bg-bg-page p-2 rounded-md border border-primary shadow-[0_0_0_1px_rgb(var(--bg-card))]"
                  style={{ backgroundColor: "rgba(var(--bg-card), 0.6)" }}
                >
                  <ColorPicker
                    label="Highlight 1"
                    value={
                      color?.data.value === undefined
                        ? undefined
                        : highlight1Value
                    }
                    setValue={set("theme/highlight-1")}
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
                  stroke={theme.colors["bg-card"]}
                  className="ml-2"
                />
              </div>

              <div
                className="rounded-t-lg p-2  border border-border border-b-transparent shadow-md text-primary"
                style={{
                  backgroundColor: "rgba(var(--bg-card), var(--bg-card-alpha))",
                }}
              >
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
            <Popover.Arrow asChild width={16} height={8} viewBox="0 0 16 8">
              <PopoverArrow
                arrowFill={theme.colors["white"]}
                arrowStroke={theme.colors["border"]}
              />
            </Popover.Arrow>
          </Popover.Content>
        </Popover.Portal>
      </Tooltip.Root>
    </Popover.Root>
  );
};
