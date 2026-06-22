import { useEntity } from "src/replicache";
import { ImageAltSmall } from "components/Icons/ImageAlt";
import { theme } from "tailwind.config";
import { ImageAltModal } from "./ImageAltModal";
import { EditTiny } from "components/Icons/EditTiny";
import { useState } from "react";
import { useSpring, animated } from "@react-spring/web";
import useMeasure from "react-use-measure";

// Overlaid on an image; visible on hover (within a `group/image`), while the
// containing block is selected, or whenever alt text already exists. Opens the
// alt-text modal. Shared by ImageBlock and the image gallery.
export function ImageAltButton(props: {
  entityID: string;
  selected: boolean;
  className?: string;
}) {
  let hasAlt = !!useEntity(props.entityID, "image/alt")?.data.value;
  let alt = useEntity(props.entityID, "image/alt")?.data.value;
  let [showAlt, setShowAlt] = useState(false);
  let [altRef, { height: altHeight }] = useMeasure();
  let altStyle = useSpring({
    height: showAlt ? altHeight : 0,
    opacity: showAlt ? 1 : 0,
    config: { tension: 280, friction: 30 },
  });
  return (
    <div
      // Hide the alt preview only when focus leaves the whole group — moving
      // focus between siblings (e.g. ALT button → Edit trigger) keeps it open
      // so the trigger's click isn't swallowed by an early close. relatedTarget
      // is briefly null mid-handoff, so check where focus actually settled.
      onBlur={(e) => {
        let group = e.currentTarget;
        requestAnimationFrame(() => {
          if (!group.contains(document.activeElement)) setShowAlt(false);
        });
      }}
      className={`absolute bottom-1.5 right-1.5 left-1.5 transition-opacity flex flex-col h-fit ${
        props.selected || hasAlt
          ? "opacity-100"
          : "opacity-0 group-hover/image:opacity-100"
      } ${props.className || ""}`}
    >
      <div className="flex gap-1 items-center justify-end">
        <ImageAltModal
          trigger={
            <div
              aria-label="Edit alt text"
              // Keep focus on the ALT button through the click so the preview
              // doesn't blur-close and reflow the buttons mid-click.
              onMouseDown={(e) => e.preventDefault()}
              className="hover:cursor-pointer  opaque-container border-2! border-secondary! rounded-md! h-5 text-secondary"
            >
              {hasAlt ? (
                <EditTiny />
              ) : (
                <div className="text-xs font-bold px-1 leading-tight ">
                  ADD ALT
                </div>
              )}
            </div>
          }
          entityID={props.entityID}
          title={hasAlt ? "Edit Alt Text" : "Add Alt Text"}
        />
        {hasAlt && (
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              setShowAlt((s) => !s);
            }}
          >
            <div className="text-xs font-bold px-1 leading-tight opaque-container border-2! border-secondary! text-secondary rounded-md! h-5">
              ALT
            </div>
          </button>
        )}
      </div>
      <animated.div style={{ ...altStyle, overflow: "hidden" }}>
        <div
          ref={altRef}
          className="frosted-container leading-snug text-secondary border-none! line-clamp-2 text-sm px-1.5 p-1 shrink-0 mt-1"
        >
          {alt}
        </div>
      </animated.div>
    </div>
  );
}
