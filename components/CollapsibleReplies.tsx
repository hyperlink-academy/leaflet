"use client";
import { useEffect, useRef } from "react";
import { useSpring, animated } from "@react-spring/web";
import useMeasure from "react-use-measure";

// Animates a replies list's height when it opens/closes instead of snapping
// it in and out of the DOM. Shared by document comments and Bluesky thread
// replies so both collapse with the same motion.
export const CollapsibleReplies = (props: {
  open: boolean;
  children: React.ReactNode;
}) => {
  let [ref, { height }] = useMeasure();
  // Skip the spring on the first render with a real height so replies that
  // are open by default don't animate in on page load.
  let measured = useRef(false);
  let style = useSpring({
    height: props.open ? height : 0,
    opacity: props.open ? 1 : 0,
    immediate: !measured.current,
    config: { tension: 280, friction: 30 },
  });
  useEffect(() => {
    if (height > 0) measured.current = true;
  }, [height]);

  // overflow:hidden is needed to animate height, but it also clips horizontally.
  // Reply rows pull their avatar slightly left (negative margins) to sit on the
  // thread line, so extend the clip box leftward (pl-2 + matching -ml-2 keeps the
  // content in place) to keep avatars from getting shaved off.
  return (
    <animated.div
      className="pl-2 -ml-2"
      style={{ ...style, overflow: "hidden" }}
    >
      <div ref={ref}>{props.children}</div>
    </animated.div>
  );
};
