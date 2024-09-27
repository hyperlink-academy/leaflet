import { ReplicacheMutators, useEntity, useReplicache } from "src/replicache";
import { useColorAttribute } from "./useColorAttribute";
import { useEntitySetContext } from "components/EntitySetProvider";
import {
  BGPicker,
  ColorPicker,
  pickers,
  setColorAttribute,
} from "./ThemeSetter";
import { useMemo, useState } from "react";
import { CanvasBackgroundPattern } from "components/Canvas";
import { Replicache } from "replicache";

export const PageThemeSetter = (props: { entityID: string }) => {
  let { rep } = useReplicache();
  let permission = useEntitySetContext().permissions.write;

  let pageType = useEntity(props.entityID, "page/type")?.data.value || "doc";
  let primaryValue = useColorAttribute(props.entityID, "theme/primary");
  let [openPicker, setOpenPicker] = useState<pickers>("null");

  let set = useMemo(() => {
    return setColorAttribute(rep, props.entityID);
  }, [rep, props.entityID]);

  if (!permission) return null;

  return (
    <>
      <div className="pageThemeSetterContent w-80 flex flex-col gap-2 overflow-y-scroll no-scrollbar">
        <div className="pageThemeBG flex flex-col gap-2 z-10 w-full px-2 pt-2">
          {pageType === "canvas" && (
            <>
              <BackgroundPatternPicker entityID={props.entityID} rep={rep} />{" "}
              <hr className="border-border-light w-full" />
            </>
          )}

          <BGPicker
            entityID={props.entityID}
            thisPicker={"leaflet"}
            openPicker={openPicker}
            setOpenPicker={setOpenPicker}
            closePicker={() => setOpenPicker("null")}
            setValue={set("theme/card-background")}
            card
          />
        </div>
        <div className="themeLeafletTextColor w-full flex p-2 items-start text-primary">
          <ColorPicker
            label="Text"
            value={primaryValue}
            setValue={set("theme/primary")}
            thisPicker={"text"}
            openPicker={openPicker}
            setOpenPicker={setOpenPicker}
            closePicker={() => setOpenPicker("null")}
          />
        </div>
      </div>
    </>
  );
};

const BackgroundPatternPicker = (props: {
  entityID: string;
  rep: Replicache<ReplicacheMutators> | null;
}) => {
  let selectedPattern = useEntity(props.entityID, "canvas/background-pattern")
    ?.data.value;
  return (
    <div className="flex gap-2 h-8 ">
      <button
        className={`w-full rounded-md bg-bg-page border  ${selectedPattern === "grid" ? "outline outline-tertiary border-tertiary" : "transparent-outline hover:outline-border border-border "}`}
        onMouseDown={() => {
          props.rep &&
            props.rep.mutate.assertFact({
              entity: props.entityID,
              attribute: "canvas/background-pattern",
              data: { type: "canvas-pattern-union", value: "grid" },
            });
        }}
      >
        <CanvasBackgroundPattern pattern="grid" scale={0.5} />
      </button>
      <button
        className={`w-full rounded-md bg-bg-page border  ${selectedPattern === "dot" ? "outline outline-tertiary border-tertiary" : "transparent-outline hover:outline-border border-border "}`}
        onMouseDown={() => {
          props.rep &&
            props.rep.mutate.assertFact({
              entity: props.entityID,
              attribute: "canvas/background-pattern",
              data: { type: "canvas-pattern-union", value: "dot" },
            });
        }}
      >
        <CanvasBackgroundPattern pattern="dot" scale={0.5} />
      </button>
      <button
        className={`w-full rounded-md bg-bg-page border  ${selectedPattern === "plain" ? "outline outline-tertiary border-tertiary" : "transparent-outline hover:outline-border border-border "}`}
        onMouseDown={() => {
          props.rep &&
            props.rep.mutate.assertFact({
              entity: props.entityID,
              attribute: "canvas/background-pattern",
              data: { type: "canvas-pattern-union", value: "plain" },
            });
        }}
      >
        <CanvasBackgroundPattern pattern="plain" />
      </button>
    </div>
  );
};
