import { useEntity, useReplicache } from "src/replicache";
import { useColorAttribute } from "./useColorAttribute";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useViewportSize } from "@react-aria/utils";
import {
  BGPicker,
  ColorPicker,
  pickers,
  setColorAttribute,
} from "./ThemeSetter";
import { useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { PopoverArrow } from "components/Icons";

export const PageThemeSetter = (props: { entityID: string }) => {
  let { rep } = useReplicache();
  let primaryValue = useColorAttribute(props.entityID, "theme/primary");
  let pageValue = useColorAttribute(props.entityID, "theme/card-background");
  let [openPicker, setOpenPicker] = useState<pickers>("null");
  let permission = useEntitySetContext().permissions.write;
  let backgroundImage = useEntity(props.entityID, "theme/background-image");
  let backgroundRepeat = useEntity(
    props.entityID,
    "theme/background-image-repeat",
  );

  let set = useMemo(() => {
    return setColorAttribute(rep, props.entityID);
  }, [rep, props.entityID]);

  if (!permission) return null;

  return (
    <>
      <div className="themeSetterContent flex flex-col w-full overflow-y-scroll no-scrollbar">
        <div className="themeBGLeaflet flex">
          <ColorPicker
            label="Page"
            value={pageValue}
            setValue={set("theme/card-background")}
            thisPicker={"page"}
            openPicker={openPicker}
            setOpenPicker={setOpenPicker}
            closePicker={() => setOpenPicker("null")}
          />
        </div>
        <>
          <div className="themeLeafletTextColor w-full flex p-2 items-start">
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
        </>
      </div>
    </>
  );
};
