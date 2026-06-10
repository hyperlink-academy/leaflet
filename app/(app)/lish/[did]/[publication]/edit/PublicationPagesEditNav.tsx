"use client";
import { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  MeasuringStrategy,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import {
  restrictToHorizontalAxis,
  restrictToParentElement,
} from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { generateKeyBetween } from "fractional-indexing";
import { v7 } from "uuid";
import {
  ButtonPrimary,
  ButtonTertiary,
} from "components/Buttons";
import { InputWithLabel } from "components/Input";
import { Popover } from "components/Popover";
import { EditTiny } from "components/Icons/EditTiny";
import { useReplicache } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import { PublicationNavSubscribe } from "../PublicationNavSubscribe";
import { type SubscribeData } from "../PublicationHeader";
import { useNavBackgroundFade } from "../useNavBackgroundFade";
import { useToaster } from "components/Toast";
import { Checkbox } from "components/Checkbox";
import { normalizeExternalLink } from "src/utils/externalPublicationLink";
import { ExternalLinkTiny } from "components/Icons/ExternalLinkTiny";
import { useCardBorderHiddenContext } from "components/ThemeManager/ThemeProvider";
import {
  usePublicationNavEntries,
  type PublicationNavEntry,
} from "./usePublicationNavEntries";

// Turn arbitrary input into a url-safe slug: lowercase ascii
// letters/numbers/dashes only.
function cleanPath(path: string) {
  if (!path) return;
  let slug = path
    .trim()
    .toLocaleLowerCase()
    .normalize("NFKD") // split accented chars so the diacritics can be stripped
    .replace(/[̀-ͯ]/g, "") // remove the diacritic marks
    .replace(/[^a-z0-9]+/g, "-") // collapse anything non-url-safe into a dash
    .replace(/^-+|-+$/g, ""); // trim leading/trailing dashes
  if (!slug) return;
  return "/" + slug;
}

// Validate a tab's path/url input and return the value to store, or null
// after an error toast. Pass the entry being edited as `excludeEntity` so
// keeping its own route isn't a conflict.
function useResolveTabRoute(entries: PublicationNavEntry[]) {
  let toaster = useToaster();
  return (
    input: string,
    external: boolean,
    excludeEntity?: string,
  ): string | null => {
    if (external) {
      let url = normalizeExternalLink(input);
      if (!url) {
        toaster({ type: "error", content: "enter a valid url (https://…)" });
        return null;
      }
      return url;
    }
    let route = cleanPath(input);
    if (!route) {
      toaster({ type: "error", content: "enter a path like /about" });
      return null;
    }
    let inUse = entries.some(
      (e) => e.entity !== excludeEntity && e.route === route,
    );
    if (inUse) {
      toaster({ type: "error", content: "path already in use!" });
      return null;
    }
    return route;
  };
}

export function PublicationPagesEditNav(props: {
  publicationUrl: string | undefined;
  hideSubscribeInHeader?: boolean;
  subscribe: SubscribeData;
  selectedPage: string | null;
  onSelectPage: (entity: string) => void;
}) {
  let entries = usePublicationNavEntries();
  // Read from the live theme context so the nav responds to page-background
  // toggles in the theme editor.
  let cardBorderHidden = useCardBorderHiddenContext();
  let { rep, rootEntity } = useReplicache();

  let sortableIds = useMemo(() => entries.map((e) => e.entity), [entries]);

  let { navRef, bgOpacity } = useNavBackgroundFade(cardBorderHidden);

  let sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    let { active, over } = event;
    if (!over || active.id === over.id) return;

    let oldIndex = entries.findIndex((e) => e.entity === active.id);
    let newIndex = entries.findIndex((e) => e.entity === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    let reordered = arrayMove(entries, oldIndex, newIndex);
    let before = reordered[newIndex - 1]?.position ?? null;
    let after = reordered[newIndex + 1]?.position ?? null;
    let moved = entries[oldIndex];

    rep?.mutate.assertFact({
      id: moved.factID,
      entity: rootEntity,
      attribute: "root/page",
      data: {
        type: "ordered-reference",
        value: moved.entity,
        position: generateKeyBetween(before, after),
      },
    });
  }

  return (
    <nav
      ref={navRef}
      className={`publicationPagesNav editorScrollStickyHeader  z-10 shrink-0 sticky  mx-1 sm:mx-2 ${cardBorderHidden ? "pt-3 -top-6 bg-bg-page" : "top-2 rounded-md"}`}
    >
      {!cardBorderHidden && (
        <div
          className="absolute inset-0 -z-10 light-container pointer-events-none"
          style={{ opacity: bgOpacity }}
        />
      )}
      <div className="flex  items-center justify-between  gap-3 px-2  w-full sm:max-w-(--page-width-units) mx-auto">
        <div className="pubPageTabs flex items-center gap-4 min-w-0 overflow-x-auto pt-1 pb-5 -mb-5">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            autoScroll={false}
            measuring={{
              droppable: { strategy: MeasuringStrategy.Always },
            }}
            modifiers={[restrictToHorizontalAxis, restrictToParentElement]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortableIds}
              strategy={horizontalListSortingStrategy}
            >
              {/* Deleting the selected page needs no special handling here —
                  the editor falls back to the home page when the selected
                  entity disappears from the nav. */}
              {entries.map((entry) => (
                <SortableTab
                  key={entry.entity}
                  entry={entry}
                  entries={entries}
                  active={entry.entity === props.selectedPage}
                  publicationUrl={props.publicationUrl}
                  onSelect={() => {
                    if (!entry.externalUrl) props.onSelectPage(entry.entity);
                  }}
                />
              ))}
            </SortableContext>
          </DndContext>
          <AddPageButton
            entries={entries}
            publicationUrl={props.publicationUrl}
            onCreated={(entity, external) => {
              if (!external) props.onSelectPage(entity);
            }}
          />
        </div>
        {props.hideSubscribeInHeader && (
          <div className="pointer-events-none">
            <PublicationNavSubscribe {...props.subscribe} />
          </div>
        )}
      </div>
      <div
        className="border-b border-border-light"
        style={cardBorderHidden ? undefined : { opacity: 1 - bgOpacity }}
      />
    </nav>
  );
}

function AddPageButton(props: {
  entries: PublicationNavEntry[];
  publicationUrl: string | undefined;
  onCreated: (entity: string, external: boolean) => void;
}) {
  let { rep, rootEntity } = useReplicache();
  let entitySet = useEntitySetContext();
  let resolveTabRoute = useResolveTabRoute(props.entries);
  let [open, setOpen] = useState(false);
  let [name, setName] = useState("");
  let [path, setPath] = useState("");
  // While the path is "linked" it tracks cleanPath(name); editing the path
  // field directly breaks the link so it stays whatever the user typed.
  let [pathLinked, setPathLinked] = useState(true);
  // When set, this page is an external link rather than a hosted page; the
  // path input is disabled and we collect a URL instead.
  let [isExternal, setIsExternal] = useState(false);
  let [externalLink, setExternalLink] = useState("");

  function handleNameChange(newName: string) {
    setName(newName);
    if (pathLinked) setPath(cleanPath(newName) ?? "");
  }

  function handlePathChange(newPath: string) {
    setPath(newPath);
    setPathLinked(false);
  }

  function handleOpenChange(o: boolean) {
    setOpen(o);
    if (o) {
      setName("");
      setPath("");
      setPathLinked(true);
      setIsExternal(false);
      setExternalLink("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rep) return;

    let value = resolveTabRoute(
      isExternal ? externalLink : path,
      isExternal,
    );
    if (value === null) return;

    let newEntity = v7();
    if (isExternal) {
      await rep.mutate.addPublicationNavLink({
        rootEntity,
        linkEntity: newEntity,
        permission_set: entitySet.set,
        navFactID: v7(),
        url: value,
        title: name.trim(),
      });
    } else {
      await rep.mutate.addPublicationNavPage({
        rootEntity,
        pageEntity: newEntity,
        permission_set: entitySet.set,
        navFactID: v7(),
        route: value,
        title: name.trim(),
        firstBlockEntity: v7(),
        firstBlockFactID: v7(),
      });
    }
    setOpen(false);
    props.onCreated(newEntity, isExternal);
  }

  return (
    <Popover
      asChild
      align="end"
      open={open}
      onOpenChange={handleOpenChange}
      className="w-sm py-3!"
      trigger={
        <button
          type="button"
          aria-label="Add page"
          className="flex items-center px-1 mt-1 mb-[5px]  border-transparent hover:bold-accent-contrast text-accent-contrast hover:bg-[var(--accent-light)] rounded-md text-sm font-bold w-max text-nowrap"
        >
          New Page
        </button>
      }
    >
      <form
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === "Tab") e.stopPropagation();
        }}
        className="flex flex-col gap-2"
      >
        <InputWithLabel
          label="Page Title"
          type="text"
          name="page-title"
          autoComplete="off"
          value={name}
          onChange={(e) => handleNameChange(e.currentTarget.value)}
          autoFocus
        />
        {isExternal ? (
          <>
            <InputWithLabel
              label="External Link"
              type="text"
              name="external-link"
              placeholder="https://example.com"
              autoComplete="off"
              value={externalLink}
              onChange={(e) => setExternalLink(e.currentTarget.value)}
            />{" "}
            <div className="h-1 w-full spacer" />
          </>
        ) : (
          <>
            <InputWithLabel
              label="Path"
              type="text"
              name="page-path"
              placeholder="/about"
              autoComplete="off"
              value={path}
              disabled={isExternal}
              onChange={(e) => handlePathChange(e.currentTarget.value)}
            />
            <div className="text-sm text-tertiary -mt-1">
              {props.publicationUrl?.replace(/^https?:\/\//, "")}
              {cleanPath(path)}
            </div>
          </>
        )}
        <hr className="border-border-light" />
        <Checkbox
          checked={isExternal}
          onChange={(e) => setIsExternal(e.currentTarget.checked)}
          small
        >
          Link to an external URL
        </Checkbox>

        <hr className="border-border-light" />

        <ButtonPrimary
          type="submit"
          disabled={
            !name.trim() ||
            (isExternal ? !externalLink.trim() : !path.trim())
          }
          fullWidth
          compact
          className="mt-2"
        >
          Create Page
        </ButtonPrimary>
      </form>
    </Popover>
  );
}

function SortableTab(props: {
  entry: PublicationNavEntry;
  entries: PublicationNavEntry[];
  active: boolean;
  publicationUrl: string | undefined;
  onSelect: () => void;
}) {
  let {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.entry.entity });
  let { rep, rootEntity } = useReplicache();
  let resolveTabRoute = useResolveTabRoute(props.entries);
  let external = !!props.entry.externalUrl;
  let isHome = props.entry.route === "/";
  let [popoverOpen, setPopoverOpen] = useState(false);
  let [mode, setMode] = useState<"edit" | "confirm">("edit");
  let [name, setName] = useState(props.entry.title);
  let [path, setPath] = useState(
    props.entry.externalUrl ?? props.entry.route ?? "/",
  );

  let style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 1 : undefined,
  };
  function handleOpenChange(o: boolean) {
    setPopoverOpen(o);
    if (o) {
      setName(props.entry.title);
      setPath(props.entry.externalUrl ?? props.entry.route ?? "/");
      setMode("edit");
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!rep) return;

    // The home page always lives at "/"; only its title can change.
    let nextPath = isHome
      ? "/"
      : resolveTabRoute(path, external, props.entry.entity);
    if (nextPath === null) return;

    let trimmedTitle = name.trim();
    await rep.mutate.assertFact([
      {
        entity: props.entry.entity,
        attribute: "page/title",
        data: { type: "string", value: trimmedTitle },
      },
      external
        ? {
            entity: props.entry.entity,
            attribute: "page/external-url",
            data: { type: "string", value: nextPath },
          }
        : {
            entity: props.entry.entity,
            attribute: "page/route",
            data: { type: "string", value: nextPath },
          },
    ]);
    setPopoverOpen(false);
  }

  async function handleDelete() {
    if (!rep) return;
    await rep.mutate.removePublicationNavEntry({
      rootEntity,
      entity: props.entry.entity,
    });
    setPopoverOpen(false);
  }

  let label = (
    <>
      {props.entry.title ||
        props.entry.externalUrl ||
        props.entry.route ||
        "/"}{" "}
      {external && <ExternalLinkTiny />}
    </>
  );
  let tabClassName = `block px-1 pt-1 pb-0.5 text-sm font-bold text-inherit no-underline! select-none border-b-3 ${
    props.active ? "border-accent-contrast" : "border-transparent"
  }`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group/sortable-tab flex items-center shrink-0 ${
        isDragging ? "opacity-50" : ""
      } ${
        props.active
          ? "text-accent-contrast"
          : "text-tertiary hover:text-secondary"
      }`}
    >
      {external ? (
        <a
          href={props.entry.externalUrl!}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex gap-1 items-center ${tabClassName}`}
        >
          {label}
        </a>
      ) : (
        <button type="button" onClick={props.onSelect} className={tabClassName}>
          {label}
        </button>
      )}
      <div
        className={`absolute top-full inset-x-0 flex items-center pt-0.5 ${
          props.active || popoverOpen
            ? "opacity-100"
            : "opacity-0 group-hover/sortable-tab:opacity-100 focus-within:opacity-100"
        }`}
      >
        <button
          ref={setActivatorNodeRef}
          type="button"
          aria-label="Drag to reorder"
          className="grow h-[9px] cursor-grab touch-none"
          style={{
            maskImage: "var(--gripperSVGVertical)",
            maskRepeat: "repeat",
            backgroundColor: "currentColor",
          }}
          {...attributes}
          {...listeners}
        />
      </div>
      <Popover
        asChild
        align="end"
        open={popoverOpen}
        onOpenChange={handleOpenChange}
        className="w-sm py-3!"
        trigger={
          <button
            type="button"
            aria-label="Edit page"
            className={`${props.active ? "opacity-100" : "opacity-0"}
            absolute -top-1 -right-4
            shrink-0 p-0.5 bg-accent-1 text-accent-2 rounded-full
            group-hover/sortable-tab:opacity-100
            focus:opacity-100   `}
          >
            <EditTiny />
          </button>
        }
      >
        {mode === "edit" ? (
          <form
            onSubmit={handleSave}
            onKeyDown={(e) => {
              if (e.key === "Tab") e.stopPropagation();
            }}
            className="flex flex-col gap-2"
          >
            <InputWithLabel
              label="Page Title"
              type="text"
              name="page-title"
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              autoFocus
            />
            {external ? (
              <InputWithLabel
                label="External Link"
                type="text"
                name="external-link"
                autoComplete="off"
                value={path}
                onChange={(e) => setPath(e.currentTarget.value)}
                placeholder="https://example.com"
              />
            ) : isHome ? (
              <div className="text-sm text-tertiary leading-tight -mt-1">
                The home page always lives at{" "}
                <strong>
                  {props.publicationUrl?.replace(/^https?:\/\//, "")}/
                </strong>
              </div>
            ) : (
              <>
                <InputWithLabel
                  label="Path"
                  type="text"
                  name="page-path"
                  autoComplete="off"
                  value={path}
                  onChange={(e) => setPath(e.currentTarget.value)}
                  placeholder="/about"
                />
                <div className="text-sm text-tertiary leading-tight -mt-1">
                  <strong>Full page link</strong> <br />
                  {props.publicationUrl?.replace(/^https?:\/\//, "")}
                  {cleanPath(path)}
                </div>
              </>
            )}

            <ButtonPrimary type="submit" fullWidth compact>
              Save
            </ButtonPrimary>
            {!isHome && (
              <>
                <hr className="mt-1 border-border-light" />
                <ButtonTertiary
                  fullWidth
                  type="button"
                  onClick={() => setMode("confirm")}
                >
                  Delete
                </ButtonTertiary>
              </>
            )}
          </form>
        ) : (
          <div className="flex flex-col gap-2 text-center justify-center">
            <h3>Are you sure?</h3>
            <div className="text-secondary  pb-1">
              This will permanently delete{" "}
              <div className="font-bold text-secondary">
                {props.entry.title ||
                  props.entry.externalUrl ||
                  props.entry.route ||
                  "this page"}
              </div>
            </div>
            <div className="flex gap-2 justify-center items-center pb-1">
              <ButtonTertiary type="button" onClick={() => setMode("edit")}>
                Nevermind
              </ButtonTertiary>
              <ButtonPrimary onClick={handleDelete}>Delete</ButtonPrimary>
            </div>
          </div>
        )}
      </Popover>
    </div>
  );
}
