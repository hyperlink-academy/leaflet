import { useEffect, useState } from "react";
import { tableCellSyncID } from "src/replicache/table";
import { useYjsRealtime } from "src/yjsRealtime";
import type { CellSnapshot } from "./useTableSnapshot";

export function useTablePresence(
  cells: Record<string, Record<string, CellSnapshot>>,
  enabled: boolean,
) {
  const realtime = useYjsRealtime();
  const awareness = enabled ? realtime?.awareness : undefined;
  const [presence, setPresence] = useState(() => new Map<string, number>());

  useEffect(() => {
    if (!awareness) return;
    const cellIDs = new Set(
      Object.values(cells).flatMap((row) =>
        Object.values(row).map((cell) =>
          tableCellSyncID(cell.id, cell.generation),
        ),
      ),
    );
    const update = () => {
      const next = new Map<string, number>();
      for (const [clientID, state] of awareness.getStates()) {
        const cellID = state.cursor?.entityID;
        if (
          clientID === awareness.clientID ||
          !cellIDs.has(cellID) ||
          next.has(cellID)
        )
          continue;
        const hue = state.user?.hue;
        next.set(cellID, Number.isFinite(hue) ? hue : 0);
      }
      // Caret movement inside the same cell leaves its outline unchanged.
      setPresence((previous) =>
        previous.size === next.size &&
        [...next].every(([id, hue]) => previous.get(id) === hue)
          ? previous
          : next,
      );
    };
    update();
    awareness.on("change", update);
    return () => awareness.off("change", update);
  }, [awareness, cells]);

  return awareness ? presence : undefined;
}
