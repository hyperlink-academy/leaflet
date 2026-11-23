"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { EditorView } from "prosemirror-view";
import { toggleMark } from "prosemirror-commands";
import { v7 } from "uuid";
import { RenderYJSFragment } from "../TextBlock/RenderYJSFragment";
import { schema } from "../TextBlock/schema";
import { useStaleClient } from "../TextBlock/schemaVersion";
import { flushPendingTextWrites } from "../TextBlock/useCollabText";
import { BlockLayout, type BlockProps } from "../Block";
import { useEntity, useReplicache } from "src/replicache";
import {
  byTablePosition,
  MAX_TABLE_CELLS,
  mapTableCells,
  TABLE_MIN_COLUMN_WIDTH,
  tableFactIndex,
  validTableSize,
} from "src/replicache/table";
import { scanIndex } from "src/replicache/utils";
import { useSubscribe } from "src/replicache/useSubscribe";
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

type Address = { row: string; column: string };
type Axis = "row" | "column";
const newAxis = () => ({ entityID: v7(), factID: v7() });
const pendingFocus = new Set<string>();

export function focusNewTable(table: string) {
  pendingFocus.add(table);
}

const inlineMarks = [
  ["Bold", "strong"],
  ["Italic", "em"],
  ["Underline", "underline"],
  ["Strikethrough", "strikethrough"],
  ["Code", "code"],
  ["Highlight", "highlight"],
] as const;

function TableCell(props: {
  cell: string | null;
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
  const { cell } = props;
  const { rep, initialFacts } = useReplicache();
  const local = useMemo(() => tableFactIndex(initialFacts), [initialFacts]);
  const content = useSubscribe(
    rep,
    async (tx) => {
      if (!cell || !(await tx.get("initialized"))) return null;
      const scan = scanIndex(tx);
      const [[text], [generation]] = await Promise.all([
        scan.eav(cell, "block/text"),
        scan.eav(cell, "table/cell/text-generation"),
      ]);
      return {
        text: text?.data.value ?? null,
        generation: generation?.data.value ?? "",
      };
    },
    { default: null, dependencies: [cell] },
  );
  const text = content
    ? content.text
    : cell
      ? local(cell, "block/text")[0]?.data.value
      : undefined;
  const generation =
    content?.generation ??
    (cell
      ? local(cell, "table/cell/text-generation")[0]?.data.value
      : undefined) ??
    "";
  const Tag = props.header ? "th" : "td";
  return (
    <Tag
      scope={props.header ? "col" : undefined}
      className={`relative border border-border-light px-2 py-1.5 align-top wrap-anywhere whitespace-pre-wrap ${props.rowHandle ? "pr-7" : ""} ${props.header ? "font-semibold bg-bg-light" : ""} ${props.active ? "outline outline-accent-contrast outline-offset-[-2px]" : ""}`}
      style={{
        textAlign:
          props.alignment === "right" || props.alignment === "center"
            ? props.alignment
            : "left",
      }}
      onClick={(e) => {
        if (
          !props.editable ||
          e.shiftKey ||
          props.active ||
          (e.target as Element).closest("button")
        )
          return;
        e.preventDefault();
        flushSync(props.activate);
      }}
    >
      {props.rowHandle && (
        <div className="absolute top-1 right-1">{props.rowHandle}</div>
      )}
      {cell && props.active && props.editable ? (
        <TableCellEditor
          key={generation}
          cell={cell}
          generation={generation}
          value={text}
          label={props.label}
          onNavigate={props.navigate}
          onPaste={props.paste}
          editorRef={props.editorRef}
        />
      ) : text ? (
        <RenderYJSFragment value={text} wrapper={null} renderComments={false} />
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
  const rows = useEntity(table, "table/row")
    .toSorted(byTablePosition)
    .map((f) => f.data.value);
  const columns = useEntity(table, "table/column")
    .toSorted(byTablePosition)
    .map((f) => f.data.value);
  const header =
    useEntity(table, "table/header-row")?.data.value === rows[0] && !!rows[0];
  const striped = useEntity(table, "table/style")?.data.value === "striped";
  const borders = useEntity(table, "table/borders")?.data.value !== false;
  const stale = useStaleClient((s) => s.stale);
  const { permissions, set } = useEntitySetContext();
  const { rep, undoManager } = useReplicache();
  const [active, setActive] = useState<Address | null>(null);
  const [pendingCell, setPendingCell] = useState<Address | null>(null);
  const [context, setContext] = useState<Address | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [drag, setDrag] = useState<{ axis: Axis; entity: string } | null>(null);
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
  const alignment =
    useEntity(contextColumn ?? null, "table/column/alignment")?.data.value ??
    "left";
  const target = { table, permission_set: set };

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
      setLinkOpen(false);
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
  async function add(axis: Axis, after?: string, focusNew = false) {
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
          column: axis === "column" ? item.entityID : columns[0],
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
      setLinkOpen(false);
      frame.current?.focus();
      return true;
    }
    if (activeRow < 0 || activeColumn < 0) return false;
    const index =
      activeRow * columns.length +
      activeColumn +
      (direction === "Shift-Tab" ? -1 : 1);
    if (index < 0) return false;
    if (index >= rows.length * columns.length) {
      if (direction === "Tab") void add("row", undefined, true);
      return true;
    }
    void activate({
      row: rows[Math.floor(index / columns.length)],
      column: columns[index % columns.length],
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

  const reorderHandle = (axis: Axis, entity: string, label: string) => (
    <button
      type="button"
      draggable
      data-draggable="table-axis"
      title={label}
      aria-label={label}
      className="cursor-grab px-1 text-tertiary hover:text-primary"
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("application/x-leaflet-table-axis", entity);
        setDrag({ axis, entity });
      }}
      onDragEnd={() => setDrag(null)}
    >
      ⠿
    </button>
  );

  const dropOn = (axis: Axis, entity: string) => ({
    onDragOver(e: React.DragEvent) {
      if (drag?.axis !== axis) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
    },
    onDrop(e: React.DragEvent) {
      if (drag?.axis !== axis) return;
      e.preventDefault();
      e.stopPropagation();
      const moving = drag.entity;
      setDrag(null);
      void move(axis, moving, entity);
    },
  });

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

  const columnValues = useSubscribe(
    rep,
    async (tx) => {
      if (!(await tx.get("initialized"))) return null;
      return Object.fromEntries(
        await Promise.all(
          columns.map(async (column) => [
            column,
            (await scanIndex(tx).eav(column, "table/column/alignment"))[0]?.data
              .value ?? "left",
          ]),
        ),
      );
    },
    { default: null, dependencies: [columns.join(",")] },
  );
  const { initialFacts } = useReplicache();
  const local = useMemo(() => tableFactIndex(initialFacts), [initialFacts]);
  const resolvedAlignments = columns.map(
    (column) =>
      columnValues?.[column] ??
      local(column, "table/column/alignment")[0]?.data.value ??
      "left",
  );
  const renderRow = (row: string, rowIndex: number, headerRow: boolean) => (
    <TableRow
      key={row}
      row={row}
      rowIndex={rowIndex}
      columns={columns}
      alignments={resolvedAlignments}
      header={headerRow}
      editable={editable}
      currentColumn={active?.row === row ? active.column : undefined}
      rowHandle={
        editable && selected && !headerRow
          ? reorderHandle("row", row, `Drag row ${rowIndex + 1}`)
          : undefined
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
      drop={dropOn("row", row)}
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
        onBlur={(e) => {
          if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget))
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
          } else if (e.key === "Enter" && rows[0] && columns[0]) {
            e.preventDefault();
            void activate({ row: contextRow, column: contextColumn });
          }
        }}
      >
        {editable && (
          <div className="relative flex flex-wrap items-center gap-2 py-1 text-sm [&_button]:rounded [&_button]:px-1 [&_button]:hover:bg-bg-light [&_button:disabled]:opacity-40">
            {rep && (
              <Menu
                align="start"
                className="min-w-44 max-h-(--radix-dropdown-menu-content-available-height) overflow-y-auto"
                onOpenChange={(open) => {
                  if (open) useUIState.getState().focusAndSelectBlock(props);
                }}
                trigger={<span>Table options</span>}
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
            {active &&
              selected &&
              inlineMarks.map(([label, mark]) => (
                <button
                  key={mark}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const view = editorRef.current;
                    if (!view) return;
                    toggleMark(schema.marks[mark])(
                      view.state,
                      view.dispatch,
                      view,
                    );
                    view.focus();
                  }}
                >
                  {label}
                </button>
              ))}
            {active && selected && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setLinkOpen(!linkOpen)}
              >
                Link
              </button>
            )}
            {active && linkOpen && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const href = String(
                    new FormData(e.currentTarget).get("link") ?? "",
                  ).trim();
                  const view = editorRef.current;
                  if (!view || (href && !/^(https?:|mailto:|tel:)/i.test(href)))
                    return;
                  const mark = schema.marks.link;
                  const { from, to } = view.state.selection;
                  let transaction = view.state.tr.removeMark(from, to, mark);
                  if (href) {
                    if (from === to)
                      transaction = transaction
                        .insertText(href, from)
                        .addMark(
                          from,
                          from + href.length,
                          mark.create({ href }),
                        );
                    else
                      transaction = transaction.addMark(
                        from,
                        to,
                        mark.create({ href }),
                      );
                  }
                  view.dispatch(transaction);
                  setLinkOpen(false);
                  view.focus();
                }}
              >
                <input
                  name="link"
                  aria-label="Link URL"
                  placeholder="https://"
                  autoFocus
                />
                <button type="submit">Apply</button>
              </form>
            )}
          </div>
        )}
        <div
          className="overflow-x-auto overscroll-x-contain"
          onWheel={(e) => {
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) e.stopPropagation();
          }}
        >
          {editable && selected && (
            <div
              className="flex w-full"
              style={{ minWidth: columns.length * TABLE_MIN_COLUMN_WIDTH }}
              aria-label="Column drag handles"
            >
              {columns.map((column, i) => (
                <div
                  key={column}
                  className="flex-1 text-center"
                  {...dropOn("column", column)}
                >
                  {reorderHandle("column", column, `Drag column ${i + 1}`)}
                </div>
              ))}
            </div>
          )}
          <table
            style={{ minWidth: columns.length * TABLE_MIN_COLUMN_WIDTH }}
            className={`w-full table-fixed border-collapse ${borders ? "" : "[&_td]:border-transparent [&_th]:border-transparent"} ${striped ? "[&_tbody_tr:nth-child(even)]:bg-bg-light" : ""}`}
          >
            {header && <thead>{renderRow(rows[0], 0, true)}</thead>}
            <tbody>
              {rows
                .slice(header ? 1 : 0)
                .map((row, i) => renderRow(row, i + Number(header), false))}
            </tbody>
          </table>
        </div>
      </div>
    </BlockLayout>
  );
}

function TableRow(props: {
  row: string;
  rowIndex: number;
  columns: readonly string[];
  alignments: readonly string[];
  header: boolean;
  rowHandle?: React.ReactNode;
  editable: boolean;
  currentColumn?: string;
  editorRef: React.RefObject<EditorView | null>;
  navigate: (direction: Navigation) => boolean;
  paste: (grid: TableGrid | "too-large") => void;
  activate: (column: string) => void;
  ensure: (column: string) => void;
  drop: React.HTMLAttributes<HTMLTableRowElement>;
}) {
  const { row, currentColumn } = props;
  const { rep, initialFacts } = useReplicache();
  const local = useMemo(() => tableFactIndex(initialFacts), [initialFacts]);
  const fallback = useMemo(
    () =>
      Object.fromEntries(
        mapTableCells(
          local(row, "table/row/cell"),
          (cell) => local(cell, "table/cell/column")[0]?.data.value,
        ),
      ),
    [local, row],
  );
  const cells = useSubscribe(
    rep,
    async (tx) => {
      if (!(await tx.get("initialized"))) return null;
      const scan = scanIndex(tx);
      const entries = await scan.eav(row, "table/row/cell");
      const columns = new Map(
        await Promise.all(
          entries.map(async (entry) => {
            const id = entry.data.value;
            return [
              id,
              (await scan.eav(id, "table/cell/column"))[0]?.data.value,
            ] as const;
          }),
        ),
      );
      return Object.fromEntries(
        mapTableCells(entries, (id) => columns.get(id)),
      );
    },
    { default: null, dependencies: [row] },
  );
  const resolved = cells ?? fallback;
  const repairing = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!props.editable || !currentColumn || !cells || cells[currentColumn]) {
      repairing.current = undefined;
      return;
    }
    if (repairing.current === currentColumn) return;
    repairing.current = currentColumn;
    props.ensure(currentColumn);
  }, [currentColumn, cells, props]);
  return (
    <tr {...props.drop}>
      {props.columns.map((column, i) => (
        <TableCell
          key={column}
          cell={resolved[column] ?? null}
          label={`Row ${props.rowIndex + 1}, column ${i + 1}`}
          alignment={props.alignments[i]}
          rowHandle={i === 0 ? props.rowHandle : undefined}
          header={props.header}
          active={currentColumn === column}
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
