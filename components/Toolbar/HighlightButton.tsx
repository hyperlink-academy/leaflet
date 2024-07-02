import { setEditorState, useEditorStates } from "src/state/useEditorState";
import { useUIState } from "src/useUIState";
import { schema } from "components/TextBlock/schema";
import { TextSelection } from "prosemirror-state";
import { toggleMarkInFocusedBlock } from "./TextDecorationButton";
import * as Popover from "@radix-ui/react-popover";
import { theme } from "../../tailwind.config";

import {
  ColorPicker as SpectrumColorPicker,
  parseColor,
  Color,
  ColorArea,
  ColorThumb,
  ColorSlider,
  Input,
  ColorField,
  SliderTrack,
  ColorSwatch,
} from "react-aria-components";
import {
  ColorPicker,
  pickers,
  SectionArrow,
  setColorAttribute,
} from "components/ThemeManager/ThemeSetter";
import { useEntity, useReplicache } from "src/replicache";
import { useMemo, useState } from "react";
import { useColorAttribute } from "components/ThemeManager/useColorAttribute";
import { useParams } from "next/navigation";
import { rangeHasMark } from "src/utils/prosemirror/rangeHasMark";

export const HighlightColorButton = (props: {
  color: "1" | "2" | "3";
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
        className={`w-6 h-6 rounded-full border-2 border-white shadow-[0_0_0_1px_#8C8C8C]`}
        style={{
          backgroundColor:
            props.color === "1"
              ? theme.colors["highlight-1"]
              : props.color === "2"
                ? theme.colors["highlight-2"]
                : theme.colors["highlight-3"],
        }}
      />
    </button>
  );
};

export const HighlightColorSettings = () => {
  let { rep } = useReplicache();
  let params = useParams();
  let docID = params.doc_id as string;
  let set = useMemo(() => {
    return setColorAttribute(rep, docID);
  }, [rep, docID]);

  let [openPicker, setOpenPicker] = useState<pickers>("null");

  let backgroundImage = useEntity(docID, "theme/background-image");
  let backgroundRepeat = useEntity(docID, "theme/background-image-repeat");

  let highlight1Value = useColorAttribute(docID, "theme/highlight-1");
  let highlight2Value = useColorAttribute(docID, "theme/highlight-2");
  let highlight3Value = useColorAttribute(docID, "theme/highlight-3");

  return (
    <Popover.Root>
      <Popover.Trigger>settings</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="themeSetterWrapper z-20 w-80 h-fit max-h-[80vh] bg-white rounded-md border border-border flex"
          align="center"
          sideOffset={4}
          collisionPadding={16}
        >
          <div
            className="bg-bg-page w-full mx-2 p-3 pb-0 my-3 flex flex-col rounded-md  border border-border"
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
                  value={highlight1Value}
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
                <span className="highlight bg-highlight-3">Happy theming!</span>
              </small>
            </div>
          </div>
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
