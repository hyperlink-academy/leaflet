// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { EditorView } from "prosemirror-view";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createUndoManager } from "src/undoManager";
import { createYjsText } from "src/utils/createYjsText";
import { TableCellEditor, type Navigation } from "./TableCellEditor";

const persisted = vi.hoisted(() => vi.fn(async (_args: unknown) => {}));
const undoManager = createUndoManager();
vi.mock("src/replicache", () => {
  const rep = { mutate: { editTableCellText: persisted } };
  return { useReplicache: () => ({ rep, undoManager }), useEntity: () => null };
});
vi.mock("src/yjsRealtime", () => ({
  useYjsRealtime: () => null,
  YjsRealtimeConnection: class {},
}));

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Object.defineProperties(Range.prototype, {
    getClientRects: { configurable: true, value: () => [] },
    getBoundingClientRect: { configurable: true, value: () => new DOMRect() },
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(Range.prototype, "getClientRects");
  Reflect.deleteProperty(Range.prototype, "getBoundingClientRect");
});

test("cell keyboard bindings navigate without splitting the document and undo text edits", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const editorRef: { current: EditorView | null } = { current: null };
  const visited: Navigation[] = [];
  const onNavigate = (direction: Navigation) => {
    visited.push(direction);
    return true;
  };
  try {
    await act(async () =>
      root.render(
        createElement(TableCellEditor, {
          cell: "cell-1",
          generation: "",
          value: createYjsText("before"),
          label: "Row 1, column 1",
          editorRef,
          onNavigate,
          onPaste: () => {},
        }),
      ),
    );
    const view = editorRef.current!;
    expect(view.state.doc.textContent).toBe("before");

    await act(async () => {
      for (const [key, shiftKey] of [
        ["Tab", false],
        ["Tab", true],
        ["Enter", false],
        ["Escape", false],
      ] as const)
        view.dom.dispatchEvent(
          new KeyboardEvent("keydown", {
            key,
            shiftKey,
            bubbles: true,
            cancelable: true,
          }),
        );
    });
    expect(visited).toEqual(["Tab", "Shift-Tab", "Enter", "Escape"]);
    expect(view.state.doc.childCount).toBe(1);
    const edge = vi.spyOn(view, "endOfTextblock").mockReturnValue(false);
    const arrowUp = () =>
      view.dom.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowUp",
          bubbles: true,
          cancelable: true,
        }),
      );
    await act(async () => {
      arrowUp();
    });
    expect(visited.at(-1)).toBe("Escape");
    edge.mockReturnValue(true);
    await act(async () => {
      arrowUp();
    });
    expect(visited.at(-1)).toBe("ArrowUp");

    await act(async () => {
      view.dispatch(view.state.tr.insertText("!", 7));
    });
    expect(view.state.doc.textContent).toBe("before!");
    await act(async () => {
      await undoManager.undo();
    });
    expect(view.state.doc.textContent).toBe("before");
    await act(async () => {
      await undoManager.redo();
    });
    expect(view.state.doc.textContent).toBe("before!");
    expect(persisted).toHaveBeenCalled();
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
