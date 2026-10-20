"use client";
import { useEffect, useRef, useState } from "react";
import { useDrag } from "@use-gesture/react";
import { useReplicache } from "src/replicache";
import { useSubscribe } from "src/replicache/useSubscribe";
import { scanIndex } from "src/replicache/utils";
import type { Data } from "src/replicache/attributes";
import { localImages } from "src/utils/addImage";
import {
  COVER_ASPECT,
  renderCoverCrop,
  saveCoverImageCrop,
  type CoverCrop,
} from "src/utils/cropCoverImage";
import { Modal } from "components/Modal";
import { ButtonPrimary } from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";

export function CoverImageCropModal(props: {
  coverEntity: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Modal
      open={props.open}
      onOpenChange={props.onOpenChange}
      className="sm:w-[560px]"
    >
      {props.coverEntity && (
        <CoverImageCropper
          coverEntity={props.coverEntity}
          onDone={() => props.onOpenChange(false)}
        />
      )}
    </Modal>
  );
}

function CoverImageCropper(props: { coverEntity: string; onDone: () => void }) {
  let { rep } = useReplicache();
  let cover = useSubscribe(
    rep,
    async (tx) => {
      if (!(await tx.get("initialized"))) return null;
      let scan = scanIndex(tx);
      let [image] = await scan.eav(props.coverEntity, "block/image");
      let [original] = await scan.eav(
        props.coverEntity,
        "cover-image/original",
      );
      let [crop] = await scan.eav(props.coverEntity, "cover-image/crop");
      return {
        image: image?.data ?? null,
        original: original?.data ?? null,
        crop: crop?.data.value ?? null,
      };
    },
    { dependencies: [props.coverEntity] },
  );
  let source = cover?.original ?? cover?.image;
  let loaded = useLoadedImage(source?.src);

  return (
    <div className="flex flex-col gap-3">
      {loaded.state === "loaded" &&
      loaded.src === source?.src &&
      cover?.image ? (
        <CropEditor
          {...props}
          bitmap={loaded.bitmap}
          url={loaded.url}
          source={source}
          savedCrop={cover.crop}
          uploading={!!cover.image.local}
        />
      ) : (
        <div className="w-full aspect-[1200/630] rounded-md bg-border-light flex items-center justify-center text-tertiary text-sm">
          {loaded.state === "error" ? (
            "Couldn't load this image"
          ) : (
            <DotLoader />
          )}
        </div>
      )}
    </div>
  );
}

const MIN_CROP = 0.15;
const KEYBOARD_MOVE = 0.02;
const KEYBOARD_SCALE = 1.1;

type Edge = "left" | "right";
const EDGE_DIRS: Record<Edge, number> = { left: -1, right: 1 };

function CropEditor(props: {
  coverEntity: string;
  bitmap: ImageBitmap;
  url: string;
  source: Data<"block/image">;
  savedCrop: CoverCrop | null;
  uploading: boolean;
  onDone: () => void;
}) {
  let { rep } = useReplicache();
  let imageAspect = props.bitmap.width / props.bitmap.height;
  let [crop, setCrop] = useState<CoverCrop>(() =>
    clampCrop(
      props.savedCrop ?? centeredCrop(maxCropWidth(imageAspect), imageAspect),
      imageAspect,
    ),
  );
  let [saving, setSaving] = useState(false);
  let [error, setError] = useState<string | null>(null);
  let imageRef = useRef<HTMLDivElement>(null);

  let move = (dx: number, dy: number) =>
    setCrop((c) => clampCrop({ ...c, x: c.x + dx, y: c.y + dy }, imageAspect));

  let scale = (factor: number) =>
    setCrop((c) =>
      clampCrop(
        centeredCrop(c.width * factor, imageAspect, [
          c.x + c.width / 2,
          c.y + c.height / 2,
        ]),
        imageAspect,
      ),
    );

  let bindMove = useDrag(({ delta: [dx, dy] }) => {
    let rect = imageRef.current?.getBoundingClientRect();
    if (!rect?.width) return;
    move(dx / rect.width, dy / rect.height);
  });

  let bindResize = useDrag(({ xy: [px], args: [edge], first, memo }) => {
    let rect = imageRef.current?.getBoundingClientRect();
    if (!rect?.width) return memo;
    let dir = EDGE_DIRS[edge as Edge];
    let anchor: [number, number] =
      first || !memo
        ? [dir > 0 ? crop.x : crop.x + crop.width, crop.y + crop.height / 2]
        : memo;
    setCrop(
      resizeFrom(anchor, dir, (px - rect.left) / rect.width, imageAspect),
    );
    return anchor;
  });

  let cropStyle = {
    left: `${crop.x * 100}%`,
    top: `${crop.y * 100}%`,
    width: `${crop.width * 100}%`,
    height: `${crop.height * 100}%`,
  };

  let save = async () => {
    if (!rep) return;
    setSaving(true);
    setError(null);
    try {
      let file = await renderCoverCrop(props.bitmap, crop);
      await saveCoverImageCrop(rep, {
        coverEntity: props.coverEntity,
        original: props.source,
        crop,
        file,
      });
      props.onDone();
    } catch (e) {
      console.error(e);
      setError("Couldn't crop this image. Please try again!");
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center gap-2">
        <p className="text-sm text-tertiary">
          {props.uploading
            ? "Finishing upload…"
            : error ?? "Drag and resize to edit the crop."}
        </p>
        <ButtonPrimary
          type="button"
          className="shrink-0"
          disabled={saving || props.uploading}
          onClick={save}
        >
          {saving ? <DotLoader className="h-[23px]" /> : "Save"}
        </ButtonPrimary>
      </div>

      <div
        tabIndex={0}
        aria-label="Cover image crop. Use the arrow keys to move the crop and + or - to resize it."
        className="flex justify-center rounded-md bg-border-light outline-none focus-visible:outline-2 focus-visible:outline-accent-contrast"
        onKeyDown={(e) => {
          let moves: Record<string, [number, number]> = {
            ArrowLeft: [-KEYBOARD_MOVE, 0],
            ArrowRight: [KEYBOARD_MOVE, 0],
            ArrowUp: [0, -KEYBOARD_MOVE],
            ArrowDown: [0, KEYBOARD_MOVE],
          };
          if (moves[e.key]) move(...moves[e.key]);
          else if (e.key === "+" || e.key === "=") scale(KEYBOARD_SCALE);
          else if (e.key === "-") scale(1 / KEYBOARD_SCALE);
          else return;
          e.preventDefault();
        }}
      >
        <div ref={imageRef} className="relative max-w-full select-none">
          <img
            src={props.url}
            alt=""
            draggable={false}
            className="block max-w-full max-h-[min(60vh,420px)] pointer-events-none"
          />
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute shadow-[0_0_0_9999px_rgb(0_0_0/0.45)]"
              style={cropStyle}
            />
          </div>
          <div
            {...bindMove()}
            className="absolute shadow-[inset_0_0_0_1px_white,inset_0_0_0_2px_#8C8C8C,0_0_0_1px_white,0_0_0_2px_#8C8C8C] touch-none cursor-move"
            style={cropStyle}
          />
          {(Object.keys(EDGE_DIRS) as Edge[]).map((edge) => (
            <div
              key={edge}
              {...bindResize(edge)}
              className="resizeHandle touch-none cursor-ew-resize absolute -translate-x-1/2 -translate-y-1/2 sm:w-[5px] w-3 sm:h-6 h-8 rounded-full bg-white border-2 border-[#8C8C8C] shadow-[0_0_0_1px_white,inset_0_0_0_1px_white]"
              style={{
                left: `${(crop.x + (EDGE_DIRS[edge] > 0 ? crop.width : 0)) * 100}%`,
                top: `${(crop.y + crop.height / 2) * 100}%`,
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function useLoadedImage(src: string | undefined) {
  let [state, setState] = useState<
    | { state: "loading" }
    | { state: "error" }
    | { state: "loaded"; src: string; bitmap: ImageBitmap; url: string }
  >({ state: "loading" });

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    let bitmap: ImageBitmap | undefined;
    let url: string | undefined;
    setState({ state: "loading" });
    (async () => {
      try {
        let response = await fetch(localImages.get(src) ?? src);
        if (!response.ok) throw new Error(`Image fetch ${response.status}`);
        let blob = await response.blob();
        bitmap = await createImageBitmap(blob);
        url = URL.createObjectURL(blob);
        if (cancelled) return cleanup();
        setState({ state: "loaded", src, bitmap, url });
      } catch (e) {
        console.error(e);
        if (!cancelled) setState({ state: "error" });
      }
    })();
    function cleanup() {
      bitmap?.close();
      if (url) URL.revokeObjectURL(url);
    }
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [src]);

  return state;
}

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

const widthPerHeight = (imageAspect: number) => COVER_ASPECT / imageAspect;

const maxCropWidth = (imageAspect: number) =>
  Math.min(1, widthPerHeight(imageAspect));

function centeredCrop(
  width: number,
  imageAspect: number,
  [cx, cy]: [number, number] = [0.5, 0.5],
): CoverCrop {
  let height = width / widthPerHeight(imageAspect);
  return { x: cx - width / 2, y: cy - height / 2, width, height };
}

function clampCrop(crop: CoverCrop, imageAspect: number): CoverCrop {
  let max = maxCropWidth(imageAspect);
  let width = clamp(crop.width, max * MIN_CROP, max);
  let height = width / widthPerHeight(imageAspect);
  return {
    x: clamp(crop.x, 0, 1 - width),
    y: clamp(crop.y, 0, 1 - height),
    width,
    height,
  };
}

function resizeFrom(
  [ax, cy]: [number, number],
  dir: number,
  px: number,
  imageAspect: number,
): CoverCrop {
  let max = maxCropWidth(imageAspect);
  let width = clamp(
    dir * (px - ax),
    max * MIN_CROP,
    Math.min(max, dir > 0 ? 1 - ax : ax),
  );
  let height = width / widthPerHeight(imageAspect);
  return {
    x: dir > 0 ? ax : ax - width,
    y: clamp(cy - height / 2, 0, 1 - height),
    width,
    height,
  };
}
