"use client";
import { create } from "zustand";

export let useCoordState = create(() => ({
  coords: [] as { x: number; y: number; color?: string }[],
}));

export function CoordDebugger() {
  let coords = useCoordState((s) => s.coords);
  return (
    <>
      {coords.map((coord, index) => (
        <div
          key={index}
          style={{
            position: "fixed",
            left: coord.x,
            top: coord.y,
            pointerEvents: "none",
            height: "16px",
            width: "16px",
            backgroundColor: coord.color || "red",
            borderRadius: "50%",
            zIndex: 9999,
          }}
        ></div>
      ))}
    </>
  );
}
