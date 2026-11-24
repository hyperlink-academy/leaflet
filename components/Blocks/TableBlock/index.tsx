"use client";

import { memo, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { EditorView } from "prosemirror-view";
import { v7 } from "uuid";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { RenderYJSFragment } from "../TextBlock/RenderYJSFragment";
import { useStaleClient } from "../TextBlock/schemaVersion";
import { flushPendingTextWrites } from "../TextBlock/useCollabText";
import { BlockLayout, type BlockProps } from "../Block";
import { useReplicache } from "src/replicache";
import { MAX_TABLE_CELLS, validTableSize } from "src/replicache/table";
import { scanIndex } from "src/replicache/utils";
import { useTableSnapshot, type CellSnapshot } from "./useTableSnapshot";
import { BlockTableSmall } from "components/Icons/BlockTableSmall";
import { focusBlock } from "src/utils/focusBlock";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useUIState } from "src/useUIState";
import { useToaster } from "components/Toast";
import {
  CheckboxMenuItem,
  Menu,
  MenuItem,
  MenuSeparator,
  RadioMenuGroup,
  RadioMenuItem,
} from "components/Menu";
import { focusPage } from "src/utils/focusPage";
import { pageOfParent } from "src/utils/blockGroups";
import { copySelection } from "src/utils/copySelection";
import type { TableGrid } from "src/utils/paste/tableClipboard";
import { TableCellEditor, type Navigation } from "./TableCellEditor";

type Address = { row: string; column: string; caret?: "start" | "end" };
type Axis = "row" | "column";
const newAxis = () => ({ entityID: v7(), factID: v7() });
const pendingFocus = new Set<string>();

export function focusNewTable(table: string) {
  pendingFocus.add(table);
}

const CellText = memo(function CellText({ value }: { value: string }) {
  return (
    <RenderYJSFragment value={value} wrapper={null} renderComments={false} />
  );
});

function TableCell(props: {
  cell?: CellSnapshot;
  table: string;
  caret?: Address["caret"];
  columnHandle?: React.ReactNode;
  label: string;
  header: boolean;
  active: boolean;
  alignment?: string;
  rowHandle?: React.ReactNode;
  editable: boolean;
  editorRef: React.RefObject<EditorView | null>;
  activate: () => void;
  navigate: (direction: Navigation) => boolean;
  paste: (grid: TableGrid | "too-large") => void;
}) {
  const { id: cell, text, generation = "" } = props.cell ?? {};
  const Tag = props.header ? "th" : "td";
  return (
    <Tag
      scope={props.header ? "col" : undefined}
      className={`relative min-w-[6em] max-w-[24em] border border-border-light px-2 py-1.5 align-top wrap-anywhere whitespace-pre-wrap ${props.rowHandle ? "pr-7" : ""} ${props.header ? "font-semibold bg-bg-light" : ""} ${props.active ? "outline outline-accent-contrast outline-offset-[-2px]" : ""}`}
      style={{
        textAlign:
          props.alignment === "right" || props.alignment === "center"
            ? props.alignment
            : "left",
      }}
      onPointerDown={(e) => {
        if (
          e.button !== 0 ||
          e.pointerType === "touch" ||
          !props.editable ||
          e.shiftKey ||
          props.active ||
          (e.target as Element).closest("button")
        )
          return;
        e.preventDefault();
        e.stopPropagation();
        flushSync(props.activate);
      }}
      onClick={(e) => {
        if (
          props.editable &&
          !props.active &&
          !e.shiftKey &&
          !(e.target as Element).closest("button")
        ) {
          e.preventDefault();
          flushSync(props.activate);
        }
      }}
    >
      {props.columnHandle && (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2">
          {props.columnHandle}
        </div>
      )}
      {props.rowHandle && (
        <div className="absolute top-1 right-1">{props.rowHandle}</div>
      )}
      {cell && props.active && props.editable ? (
        <TableCellEditor
          key={generation}
          cell={cell}
          table={props.table}
          caret={props.caret}
          generation={generation}
          value={text}
          label={props.label}
          onNavigate={props.navigate}
          onPaste={props.paste}
          editorRef={props.editorRef}
        />
      ) : text ? (
        <CellText value={text} />
      ) : (
        <span aria-hidden>&nbsp;</span>
      )}
    </Tag>
  );
}

export function TableBlock(
  props: BlockProps & {
    preview?: boolean;
    areYouSure?: boolean;
    setAreYouSure?: (value: boolean) => void;
  },
) {
  const table = props.entityID;
  const { rows, columns, cells, alignments, header, striped, borders, loaded } =
    useTableSnapshot(table);
  const stale = useStaleClient((s) => s.stale);
  const { permissions, set } = useEntitySetContext();
  const { rep, undoManager } = useReplicache();
  const [active, setActive] = useState<Address | null>(null);
  const [pendingCell, setPendingCell] = useState<Address | null>(null);
  const [context, setContext] = useState<Address | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const editorRef = useRef<EditorView | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const toast = useToaster();
  const selected = useUIState(
    (s) =>
      s.selectedBlocks.length === 1 && s.selectedBlocks[0]?.entityID === table,
  );
  const editable = permissions.write && !props.preview && !stale;
  const activeRow = active ? rows.indexOf(active.row) : -1;
  const activeColumn = active ? columns.indexOf(active.column) : -1;
  const contextRow =
    context && rows.includes(context.row) ? context.row : rows[0];
  const contextColumn =
    context && columns.includes(context.column) ? context.column : columns[0];
  const alignment = alignments[columns.indexOf(contextColumn)] ?? "left";
  const target = { table, permission_set: set, cellLimitVersion: 1 as const };

  function activate(address: Address) {
    if (!rep || !editable) return;
    useUIState.getState().focusAndSelectBlock(props);
    setContext(address);
    setActive(address);
  }

  useEffect(() => {
    if (
      !editable ||
      !selected ||
      !rep ||
      !rows[0] ||
      !columns[0] ||
      !pendingFocus.delete(table)
    )
      return;
    activate({ row: rows[0], column: columns[0] });
  }, [editable, selected, rep, rows[0], columns[0], table]);

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const focusCell = (event: Event) => {
      const last = (event as CustomEvent).detail === "last";
      const row = last ? rows.at(-1) : rows[0];
      const column = last ? columns.at(-1) : columns[0];
      if (row && column)
        activate({ row, column, caret: last ? "end" : "start" });
    };
    element.addEventListener("leaflet:focus-table-cell", focusCell);
    return () =>
      element.removeEventListener("leaflet:focus-table-cell", focusCell);
  }, [rows, columns, editable, rep, props.parent, table]);

  useEffect(() => {
    if (
      !selected ||
      !pendingCell ||
      !rows.includes(pendingCell.row) ||
      !columns.includes(pendingCell.column)
    )
      return;
    setPendingCell(null);
    activate(pendingCell);
  }, [pendingCell, selected, rows, columns]);

  useEffect(() => {
    if (!selected || !editable) {
      setActive(null);
      setPendingCell(null);
    }
  }, [selected, editable]);

  useEffect(() => {
    if (
      active &&
      (activeRow < 0 || activeColumn < 0) &&
      rows[0] &&
      columns[0]
    ) {
      activate({
        row: rows[Math.max(0, activeRow)],
        column: columns[Math.max(0, activeColumn)],
      });
    }
  }, [active, activeRow, activeColumn, rows[0], columns[0]]);

  const overLimit = () =>
    toast({
      type: "error",
      content: `Tables can have up to ${MAX_TABLE_CELLS.toLocaleString()} cells.`,
    });
  async function add(
    axis: Axis,
    after?: string,
    focusNew = false,
    focusColumn = columns[0],
  ) {
    if (!rep) return;
    if (
      !validTableSize(
        rows.length + Number(axis === "row"),
        columns.length + Number(axis === "column"),
      )
    ) {
      overLimit();
      return;
    }
    const item = newAxis();
    await flushPendingTextWrites();
    await undoManager.withUndoGroup(() =>
      rep.mutate.editTableAxis({
        ...target,
        axis,
        change: { type: "add", item, after },
      }),
    );
    if (focusNew) {
      const added = await rep.query(async (tx) =>
        (await scanIndex(tx).eav(table, `table/${axis}`)).some(
          (fact) => fact.data.value === item.entityID,
        ),
      );
      if (added)
        setPendingCell({
          row: axis === "row" ? item.entityID : contextRow,
          column: axis === "column" ? item.entityID : focusColumn,
        });
    }
  }

  async function remove(axis: Axis) {
    if (!rep) return;
    const entity = axis === "row" ? contextRow : contextColumn;
    const entries = axis === "row" ? rows : columns;
    const i = entries.indexOf(entity);
    if (i < 0 || entries.length === 1) return;
    const replacement = entries[i + 1] ?? entries[i - 1];
    await flushPendingTextWrites();
    await undoManager.withUndoGroup(() =>
      rep.mutate.editTableAxis({
        ...target,
        axis,
        change: { type: "delete", entity },
      }),
    );
    activate({
      row: axis === "row" ? replacement : contextRow,
      column: axis === "column" ? replacement : contextColumn,
    });
  }

  async function move(axis: Axis, entity: string, destination: string) {
    if (!rep || entity === destination) return;
    await undoManager.withUndoGroup(() =>
      rep.mutate.editTableAxis({
        ...target,
        axis,
        change: { type: "move", entity, target: destination },
      }),
    );
  }

  function navigate(direction: Navigation) {
    if (direction === "Escape") {
      setActive(null);
      frame.current?.focus();
      return true;
    }
    if (activeRow < 0 || activeColumn < 0) return false;
    if (direction === "Enter") {
      const row = rows[activeRow + 1];
      if (row) activate({ row, column: columns[activeColumn] });
      else void add("row", undefined, true, columns[activeColumn]);
      return true;
    }
    if (direction === "ArrowUp" || direction === "ArrowDown") {
      const row = rows[activeRow + (direction === "ArrowUp" ? -1 : 1)];
      if (row)
        activate({
          row,
          column: columns[activeColumn],
          caret: direction === "ArrowUp" ? "end" : "start",
        });
      else return exitToNeighbor(direction === "ArrowUp");
      return true;
    }
    const backward = direction === "Shift-Tab" || direction === "ArrowLeft";
    const index =
      activeRow * columns.length + activeColumn + (backward ? -1 : 1);
    if (index < 0) return direction === "ArrowLeft" && exitToNeighbor(true);
    if (index >= rows.length * columns.length) {
      if (direction === "Tab") void add("row", undefined, true);
      else return exitToNeighbor(false);
      return true;
    }
    void activate({
      row: rows[Math.floor(index / columns.length)],
      column: columns[index % columns.length],
      caret: direction === "ArrowLeft" ? "end" : "start",
    });
    return true;
  }

  function exitToNeighbor(previous: boolean) {
    const block = previous ? props.previousBlock : props.nextBlock;
    if (!block) return false;
    focusBlock(block, {
      type: previous ? "bottom" : "top",
      left: editorRef.current?.dom.getBoundingClientRect().left ?? 0,
    });
    return true;
  }

  async function paste(grid: TableGrid | "too-large") {
    if (!rep || !active) return;
    if (grid === "too-large") {
      overLimit();
      return;
    }
    const extraRows = Math.max(0, activeRow + grid.values.length - rows.length);
    const extraColumns = Math.max(
      0,
      activeColumn + grid.values[0].length - columns.length,
    );
    if (
      (extraRows || extraColumns) &&
      !validTableSize(rows.length + extraRows, columns.length + extraColumns)
    ) {
      overLimit();
      return;
    }
    await flushPendingTextWrites();
    await undoManager.withUndoGroup(() =>
      rep.mutate.pasteTableGrid({
        ...target,
        ...active,
        values: grid.values,
        generation: v7(),
        extraRows: Array.from({ length: extraRows }, newAxis),
        extraColumns: Array.from({ length: extraColumns }, newAxis),
      }),
    );
    if (grid.normalized)
      toast({
        type: "info",
        content: "Table pasted with formatting or layout adjusted.",
      });
  }

  const shift = (axis: Axis, offset: number) => {
    const entries = axis === "row" ? rows : columns;
    const entity = axis === "row" ? contextRow : contextColumn;
    const from = entries.indexOf(entity);
    const destination = from + offset;
    const first = axis === "row" && header ? 1 : 0;
    return {
      disabled:
        from < first || destination < first || destination >= entries.length,
      onSelect: () => void move(axis, entity, entries[destination]),
    };
  };

  const renderRow = (row: string, rowIndex: number, headerRow: boolean) => (
    <TableRow
      key={row}
      table={table}
      cells={cells[row] ?? {}}
      loaded={loaded}
      rowIndex={rowIndex}
      columns={columns}
      alignments={alignments}
      header={headerRow}
      editable={editable}
      currentColumn={active?.row === row ? active.column : undefined}
      caret={active?.row === row ? active.caret : undefined}
      rowHandle={
        editable && selected && !headerRow ? (
          <AxisHandle
            axis="row"
            entity={row}
            label={`Drag row ${rowIndex + 1}`}
          />
        ) : undefined
      }
      editorRef={editorRef}
      navigate={navigate}
      paste={(grid) => void paste(grid)}
      activate={(column) => void activate({ row, column })}
      ensure={(column) => {
        if (rep)
          void undoManager.withUndoGroup(() =>
            rep.mutate.ensureTableCell({ ...target, row, column }),
          );
      }}
      columnHandle={
        rowIndex === 0 && editable && selected
          ? (column, i) => (
              <AxisHandle
                axis="column"
                entity={column}
                label={`Drag column ${i + 1}`}
              />
            )
          : undefined
      }
    />
  );

  return (
    <BlockLayout
      isSelected={selected && !props.preview}
      areYouSure={props.areYouSure}
      setAreYouSure={props.setAreYouSure}
      className="min-w-0 p-0! border-transparent!"
    >
      <div
        className="w-full min-w-0"
        ref={frame}
        tabIndex={editable ? 0 : undefined}
        data-table-block
        onFocus={(e) => {
          if (editable && e.target === e.currentTarget)
            useUIState.getState().focusAndSelectBlock(props);
        }}
        onBlur={(e) => {
          if (
            e.relatedTarget &&
            (e.currentTarget.contains(e.relatedTarget) ||
              (e.relatedTarget instanceof Element &&
                e.relatedTarget.closest(".toolbar")))
          )
            return;
          if (!e.relatedTarget) return; // A cell can remount on grid paste.
          setActive(null);
        }}
        onKeyDown={(e) => {
          if (e.defaultPrevented || e.target !== frame.current) return;
          if (e.key === "Escape" && rep) {
            e.stopPropagation();
            setActive(null);
            useUIState.getState().setSelectedBlocks([]);
            void focusPage(pageOfParent(props.parent), rep);
            frame.current?.blur();
          } else if (e.key === "F2" && rows[0] && columns[0]) {
            e.preventDefault();
            void activate({ row: contextRow, column: contextColumn });
          }
        }}
      >
        {editable && selected && (
          <div className="absolute right-1 top-0 z-10 rounded border border-border-light bg-bg-page shadow-sm">
            {rep && (
              <Menu
                align="start"
                className="min-w-44 max-h-(--radix-dropdown-menu-content-available-height) overflow-y-auto"
                onOpenChange={(open) => {
                  if (open) useUIState.getState().focusAndSelectBlock(props);
                }}
                asChild
                trigger={
                  <button
                    type="button"
                    aria-label="Table options"
                    title="Table options"
                  >
                    <BlockTableSmall />
                  </button>
                }
              >
                <MenuItem onSelect={() => void add("row", contextRow, true)}>
                  Add row
                </MenuItem>
                <MenuItem
                  onSelect={() => void add("column", contextColumn, true)}
                >
                  Add column
                </MenuItem>
                <MenuItem
                  disabled={rows.length <= 1}
                  onSelect={() => void remove("row")}
                >
                  Delete row
                </MenuItem>
                <MenuItem
                  disabled={columns.length <= 1}
                  onSelect={() => void remove("column")}
                >
                  Delete column
                </MenuItem>
                <MenuItem {...shift("row", -1)}>Move row up</MenuItem>
                <MenuItem {...shift("row", 1)}>Move row down</MenuItem>
                <MenuItem {...shift("column", -1)}>Move column left</MenuItem>
                <MenuItem {...shift("column", 1)}>Move column right</MenuItem>
                <MenuSeparator />
                <CheckboxMenuItem
                  checked={header}
                  onSelect={() =>
                    void undoManager.withUndoGroup(() =>
                      rep.mutate.setTableHeaderRow({ table, enabled: !header }),
                    )
                  }
                >
                  Header row
                </CheckboxMenuItem>
                <CheckboxMenuItem
                  checked={borders}
                  onSelect={() =>
                    void undoManager.withUndoGroup(() =>
                      rep.mutate.assertFact({
                        entity: table,
                        attribute: "table/borders",
                        data: { type: "boolean", value: !borders },
                      }),
                    )
                  }
                >
                  Borders
                </CheckboxMenuItem>
                <CheckboxMenuItem
                  checked={striped}
                  onSelect={() =>
                    void undoManager.withUndoGroup(() =>
                      rep.mutate.assertFact({
                        entity: table,
                        attribute: "table/style",
                        data: {
                          type: "table-style-union",
                          value: striped ? "default" : "striped",
                        },
                      }),
                    )
                  }
                >
                  Striped rows
                </CheckboxMenuItem>
                <MenuSeparator />
                <div className="px-2 text-xs text-tertiary">
                  Column {columns.indexOf(contextColumn) + 1} alignment
                </div>
                <RadioMenuGroup
                  value={alignment}
                  onValueChange={(value) => {
                    if (
                      value !== "left" &&
                      value !== "center" &&
                      value !== "right"
                    )
                      return;
                    void undoManager.withUndoGroup(() =>
                      rep.mutate.setTableColumnAlignment({
                        table,
                        column: contextColumn,
                        alignment: value,
                      }),
                    );
                  }}
                >
                  <RadioMenuItem selected={alignment === "left"} value="left">
                    Left
                  </RadioMenuItem>
                  <RadioMenuItem
                    selected={alignment === "center"}
                    value="center"
                  >
                    Center
                  </RadioMenuItem>
                  <RadioMenuItem selected={alignment === "right"} value="right">
                    Right
                  </RadioMenuItem>
                </RadioMenuGroup>
                <MenuSeparator />
                <MenuItem
                  onSelect={() =>
                    void copySelection(rep, [props]).catch(() =>
                      toast({ type: "error", content: "Couldn’t copy table." }),
                    )
                  }
                >
                  Copy table
                </MenuItem>
              </Menu>
            )}
          </div>
        )}
        <div
          className={`overflow-x-auto overscroll-x-contain ${editable ? "pt-5" : ""}`}
          onWheel={(e) => {
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) e.stopPropagation();
          }}
        >
          <DndContext
            sensors={sensors}
            collisionDetection={(args) =>
              closestCenter({
                ...args,
                droppableContainers: args.droppableContainers.filter(
                  (target) =>
                    target.data.current?.axis ===
                    args.active.data.current?.axis,
                ),
              })
            }
            onDragEnd={({ active, over }) => {
              const from = active.data.current;
              const to = over?.data.current;
              if (from && to && from.axis === to.axis)
                void move(from.axis, from.entity, to.entity);
            }}
          >
            <table
              className={`w-full table-auto border-collapse ${borders ? "" : "[&_td]:border-transparent [&_th]:border-transparent"} ${striped ? "[&_tbody_tr:nth-child(even)]:bg-bg-light" : ""}`}
            >
              {header && <thead>{renderRow(rows[0], 0, true)}</thead>}
              <tbody>
                {rows
                  .slice(header ? 1 : 0)
                  .map((row, i) => renderRow(row, i + Number(header), false))}
              </tbody>
            </table>
          </DndContext>
        </div>
      </div>
    </BlockLayout>
  );
}

function TableRow(props: {
  table: string;
  cells: Record<string, CellSnapshot>;
  loaded: boolean;
  columnHandle?: (column: string, index: number) => React.ReactNode;
  rowIndex: number;
  columns: readonly string[];
  alignments: readonly string[];
  header: boolean;
  rowHandle?: React.ReactNode;
  editable: boolean;
  currentColumn?: string;
  caret?: Address["caret"];
  editorRef: React.RefObject<EditorView | null>;
  navigate: (direction: Navigation) => boolean;
  paste: (grid: TableGrid | "too-large") => void;
  activate: (column: string) => void;
  ensure: (column: string) => void;
}) {
  const { currentColumn, cells } = props;
  const repairing = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (
      !props.editable ||
      !currentColumn ||
      !props.loaded ||
      cells[currentColumn]
    ) {
      repairing.current = undefined;
      return;
    }
    if (repairing.current === currentColumn) return;
    repairing.current = currentColumn;
    props.ensure(currentColumn);
  }, [currentColumn, cells, props]);
  return (
    <tr>
      {props.columns.map((column, i) => (
        <TableCell
          key={column}
          table={props.table}
          cell={cells[column]}
          columnHandle={props.columnHandle?.(column, i)}
          label={`Row ${props.rowIndex + 1}, column ${i + 1}`}
          alignment={props.alignments[i]}
          rowHandle={i === 0 ? props.rowHandle : undefined}
          header={props.header}
          active={currentColumn === column}
          caret={currentColumn === column ? props.caret : undefined}
          editable={props.editable}
          activate={() => props.activate(column)}
          navigate={props.navigate}
          paste={props.paste}
          editorRef={props.editorRef}
        />
      ))}
    </tr>
  );
}

function AxisHandle({
  axis,
  entity,
  label,
}: {
  axis: Axis;
  entity: string;
  label: string;
}) {
  const id = `${axis}:${entity}`;
  const data = { axis, entity };
  const drag = useDraggable({ id, data });
  const target = useDroppable({ id, data });
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      data-draggable="table-axis"
      ref={(node) => {
        drag.setNodeRef(node);
        target.setNodeRef(node);
      }}
      {...drag.attributes}
      {...drag.listeners}
      className={`touch-none cursor-grab rounded px-1 ${target.isOver ? "bg-bg-accent text-accent-contrast" : "text-tertiary hover:text-primary"}`}
    >
      ⠿
    </button>
  );
}
