import { useEntity, useReplicache } from "src/replicache";
import { useColorAttribute } from "./useColorAttribute";
import { useEntitySetContext } from "components/EntitySetProvider";
import {
  BGPicker,
  ColorPicker,
  pickers,
  setColorAttribute,
} from "./ThemeSetter";
import { useMemo, useState } from "react";

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
        <div className="pageThemeBG flex flex-col gap-2 -mb-[6px] z-10 w-full px-2 pt-2">
          <BGPicker
            entityID={props.entityID}
            thisPicker={"leaflet"}
            openPicker={openPicker}
            setOpenPicker={setOpenPicker}
            closePicker={() => setOpenPicker("null")}
            setValue={set("theme/card-background")}
            card
          />
          {pageType === "canvas" && (
            <div className="flex gap-2">
              <button
                onMouseDown={() => {
                  rep &&
                    rep.mutate.assertFact({
                      entity: props.entityID,
                      attribute: "canvas/background-pattern",
                      data: { type: "canvas-pattern-union", value: "grid" },
                    });
                }}
              >
                grid
              </button>
              <button
                onMouseDown={() => {
                  rep &&
                    rep.mutate.assertFact({
                      entity: props.entityID,
                      attribute: "canvas/background-pattern",
                      data: { type: "canvas-pattern-union", value: "dot" },
                    });
                }}
              >
                dot
              </button>
              <button
                onMouseDown={() => {
                  rep &&
                    rep.mutate.assertFact({
                      entity: props.entityID,
                      attribute: "canvas/background-pattern",
                      data: { type: "canvas-pattern-union", value: "plain" },
                    });
                }}
              >
                plain
              </button>
            </div>
          )}
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
