import { useEntity, useReplicache } from "src/replicache";
import { generateKeyBetween } from "fractional-indexing";

import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";

import { Popover } from "components/Popover";
import { Toggle } from "components/Toggle";
import { Modal } from "components/Modal";
import { MobileSheet } from "components/MobileSheet";
import { Input } from "components/Input";
import { useIsMobile } from "src/hooks/isMobile";

import { SettingsTriggerButton } from "../SettingsTriggerButton";
import { AddSmall } from "components/Icons/AddSmall";
import { DeleteTiny } from "components/Icons/DeleteTiny";

import { GalleryFormat, useGalleryImage } from "./shared";

export function ImageGalleryOptions(props: {
  entityID: string;
  format: GalleryFormat;
  gap: number;
  lightboxEnabled: boolean;
  onEditImages: () => void;
}) {
  let { rep } = useReplicache();

  let setFormat = (value: GalleryFormat) =>
    rep?.mutate.assertFact({
      entity: props.entityID,
      attribute: "gallery/format",
      data: { type: "gallery-format-union", value },
    });

  return (
    <Popover
      asChild
      side="top"
      align="end"
      sideOffset={6}
      trigger={<SettingsTriggerButton aria-label="Image Gallery Settings" />}
    >
      <div className="flex flex-col gap-3 text-primary py-1 min-w-[220px]">
        <div className="flex flex-col gap-2">
          <h3>Format Images</h3>
          <div className="flex gap-1 w-full">
            {(["grid", "carousel", "strip"] as GalleryFormat[]).map((value) => {
              let selected = props.format === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setFormat(value)}
                  className={`flex-1 capitalize text-sm py-1.5 px-2 border outline-2 outline-offset-1 ${
                    selected
                      ? "accent-container outline-accent-contrast border-accent-contrast"
                      : "opaque-container outline-transparent"
                  }`}
                >
                  {value}
                </button>
              );
            })}
          </div>
          <label className="flex items-center justify-between gap-2 text-sm">
            <span>Gap</span>
            <Input
              type="number"
              min={0}
              className="w-20 input-with-border"
              value={String(props.gap)}
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => {
                let value = Math.max(0, Number(e.currentTarget.value) || 0);
                rep?.mutate.assertFact({
                  entity: props.entityID,
                  attribute: "gallery/gap",
                  data: { type: "number", value },
                });
              }}
            />
          </label>
        </div>

        <hr className="border-border-light my-1" />

        <Toggle
          toggle={props.lightboxEnabled}
          onToggle={() =>
            rep?.mutate.assertFact({
              entity: props.entityID,
              attribute: "gallery/lightbox",
              data: { type: "boolean", value: !props.lightboxEnabled },
            })
          }
        >
          <strong>Enable Lightbox</strong>
        </Toggle>

        <hr className="border-border-light my-1" />

        <button
          type="button"
          className="text-left text-sm text-accent-contrast"
          onMouseDown={(e) => e.preventDefault()}
          onClick={props.onEditImages}
        >
          Edit Images
        </button>
      </div>
    </Popover>
  );
}

export function EditGalleryImages(props: {
  entityID: string;
  imageFacts: ReturnType<typeof useEntity<"gallery/image">>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddFiles: (files: File[]) => void;
}) {
  let isMobile = useIsMobile();
  let content = (
    <EditGalleryImagesContent
      entityID={props.entityID}
      imageFacts={props.imageFacts}
      onAddFiles={props.onAddFiles}
    />
  );
  if (isMobile)
    return (
      <MobileSheet
        open={props.open}
        onOpenChange={props.onOpenChange}
        title="Edit Images"
      >
        {content}
      </MobileSheet>
    );
  return (
    <Modal
      open={props.open}
      onOpenChange={props.onOpenChange}
      title="Edit Images"
    >
      {content}
    </Modal>
  );
}

function EditGalleryImagesContent(props: {
  entityID: string;
  imageFacts: ReturnType<typeof useEntity<"gallery/image">>;
  onAddFiles: (files: File[]) => void;
}) {
  let { rep } = useReplicache();
  let sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  let ids = props.imageFacts.map((f) => f.data.value);

  function handleDragEnd(event: DragEndEvent) {
    let { active, over } = event;
    if (!over || active.id === over.id) return;
    let oldIndex = props.imageFacts.findIndex((f) => f.data.value === active.id);
    let newIndex = props.imageFacts.findIndex((f) => f.data.value === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    let reordered = arrayMove(props.imageFacts, oldIndex, newIndex);
    let before = reordered[newIndex - 1]?.data.position ?? null;
    let after = reordered[newIndex + 1]?.data.position ?? null;
    let moved = props.imageFacts[oldIndex];

    rep?.mutate.assertFact({
      id: moved.id,
      entity: props.entityID,
      attribute: "gallery/image",
      data: {
        type: "ordered-reference",
        value: moved.data.value,
        position: generateKeyBetween(before, after),
      },
    });
  }

  return (
    <div className="flex flex-col gap-2 min-w-[280px] sm:w-[360px]">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-1">
            {props.imageFacts.map((f) => (
              <SortableImageRow key={f.data.value} entityID={f.data.value} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <label className="flex items-center gap-2 text-sm text-accent-contrast cursor-pointer mt-1">
        <AddSmall className="scale-75" />
        Add an Image
        <input
          className="hidden"
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            let files = Array.from(e.currentTarget.files || []);
            if (files.length > 0) props.onAddFiles(files);
            e.currentTarget.value = "";
          }}
        />
      </label>
    </div>
  );
}

function SortableImageRow(props: { entityID: string }) {
  let { rep } = useReplicache();
  let {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.entityID });
  let image = useGalleryImage(props.entityID);
  let name =
    useEntity(props.entityID, "image/name")?.data.value || "Untitled image";

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`flex items-center gap-2 p-1 rounded-md border border-border-light bg-bg-page ${
        isDragging ? "opacity-60" : ""
      }`}
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        className="shrink-0 px-1 text-tertiary cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      {image && (
        <img
          src={image.src}
          alt={image.alt}
          className="w-8 h-8 object-cover rounded shrink-0"
        />
      )}
      <div className="grow min-w-0 truncate text-sm">{name}</div>
      <button
        type="button"
        aria-label="Remove image"
        className="shrink-0 text-tertiary hover:text-accent-contrast"
        onClick={() =>
          rep?.mutate.removeGalleryImage({ imageEntity: props.entityID })
        }
      >
        <DeleteTiny />
      </button>
    </div>
  );
}
