import { MarkType } from "prosemirror-model";
import { useEffect } from "react";

type AppEvent = {
  toggleMark: { mark: MarkType };
};
type Listener<T extends keyof AppEvent> = {
  key: string;
  event: T;
  cb: (data: AppEvent[T]) => void;
};
let listeners: Listener<keyof AppEvent>[] = [];

export function useAppEventListener<T extends keyof AppEvent>(
  key: string,
  event: T,
  listener: (data: AppEvent[T]) => void,
  deps: any[],
) {
  useEffect(() => {
    listeners.push({ key, cb: listener, event });
    return () => {
      listeners = listeners.filter((f) => f.cb !== listener);
    };
  }, [...deps, listener, event, key]);
}

export function publishAppEvent<T extends keyof AppEvent>(
  key: string,
  event: T,
  data: AppEvent[T],
) {
  for (let listener of listeners) {
    if (listener.event === event && listener.key === key) {
      listener.cb(data);
    }
  }
}
