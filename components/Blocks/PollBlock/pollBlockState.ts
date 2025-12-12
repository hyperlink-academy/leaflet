import { create } from "zustand";

export let usePollBlockUIState = create(
  () =>
    ({}) as {
      [entity: string]: { state: "editing" | "voting" | "results" } | undefined;
    },
);
