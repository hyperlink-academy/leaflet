import React, { useState } from "react";
import { useEntity, useReplicache } from "src/replicache";
import { localImages } from "src/utils/addImage";
import { Modal } from "components/Modal";
import { MobileSheet } from "components/MobileSheet";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import { useIsMobile } from "src/hooks/isMobile";

// Alt-text editor shown as a modal (desktop) or mobile sheet. Does not
// autosave — the value is committed on Save or Enter. Shared by ImageBlock,
// the gallery's per-image button, and the gallery lightbox.
export function ImageAltModal(props: {
  entityID: string;
  trigger: React.ReactNode;
  title: string;
}) {
  let [altEditorOpen, setAltEditorOpen] = useState(false);

  let isMobile = useIsMobile();
  // Mount fresh on open so the textarea seeds from the current alt text.

  if (isMobile)
    return (
      <MobileSheet
        trigger={props.trigger}
        title={props.title}
        open={altEditorOpen}
        onOpenChange={setAltEditorOpen}
      >
        <ImageAltModalContent
          entityID={props.entityID}
          onClose={() => setAltEditorOpen(false)}
        />
      </MobileSheet>
    );
  return (
    <Modal
      asChild
      trigger={props.trigger}
      title={props.title}
      open={altEditorOpen}
      onOpenChange={setAltEditorOpen}
    >
      <ImageAltModalContent
        entityID={props.entityID}
        onClose={() => setAltEditorOpen(false)}
      />
    </Modal>
  );
}

function ImageAltModalContent(props: {
  entityID: string;
  onClose: () => void;
}) {
  let { rep } = useReplicache();
  let image = useEntity(props.entityID, "block/image");
  let altText = useEntity(props.entityID, "image/alt")?.data.value ?? "";
  let [value, setValue] = useState(altText);
  let src = image ? localImages.get(image.data.src) ?? image.data.src : null;

  let save = async () => {
    await rep?.mutate.assertFact({
      entity: props.entityID,
      attribute: "image/alt",
      data: { type: "string", value },
    });
    props.onClose();
  };

  return (
    <div className="flex flex-col gap-3 sm:w-[360px]">
      {src && (
        <img
          src={src}
          alt={altText}
          className="w-full max-h-[40vh] object-contain rounded-md"
        />
      )}
      <textarea
        autoFocus
        className="input-with-border w-full resize-none min-h-[64px]  p-2"
        placeholder="Describe this image..."
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        onKeyDown={(e) => {
          // Enter submits; Shift+Enter inserts a newline.
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            save();
          }
        }}
      />
      <div className="flex gap-2 justify-end">
        <ButtonTertiary
          compact
          onClick={() => {
            setValue("");
            save();
          }}
        >
          Remove
        </ButtonTertiary>
        <ButtonPrimary className="self-end" compact onClick={save}>
          Save
        </ButtonPrimary>
      </div>
    </div>
  );
}
