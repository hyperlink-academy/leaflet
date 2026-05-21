"use client";
import { useRouter, usePathname } from "next/navigation";
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
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { generateKeyBetween } from "fractional-indexing";
import { SpeedyLink } from "components/SpeedyLink";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { InputWithLabel } from "components/Input";
import { Popover } from "components/Popover";
import { AddTiny } from "components/Icons/AddTiny";
import { createPublicationPage } from "actions/createPublicationPage";
import { reorderPublicationPages } from "actions/reorderPublicationPages";
import {
  usePublicationData,
  mutatePublicationData,
} from "../../dashboard/PublicationSWRProvider";
import { sortPublicationPages } from "../../sortPublicationPages";

type SortablePage = {
  id: number;
  path: string | null;
  title: string;
  sort_order: string;
};

export function PublicationPagesNav(props: {
  did: string;
  publicationName: string;
}) {
  let router = useRouter();
  let pathname = usePathname() ?? "";
  let { data, mutate } = usePublicationData();
  let [creating, setCreating] = useState(false);
  let [open, setOpen] = useState(false);
  let [name, setName] = useState("");
  let [path, setPath] = useState("/");

  let pages = data?.publication?.publication_pages ?? [];
  let publicationUri = data?.publication?.uri;

  let baseHref = `/lish/${props.did}/${props.publicationName}`;

  function hrefForPath(path: string | null) {
    let segment = path && path !== "/" ? path : "";
    return `${baseHref}/edit${segment}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (creating || !publicationUri) return;
    let trimmedPath = path.trim();
    if (!trimmedPath) return;
    if (!trimmedPath.startsWith("/")) trimmedPath = "/" + trimmedPath;
    setCreating(true);
    let created = await createPublicationPage({
      publication_uri: publicationUri,
      path: trimmedPath,
      title: name.trim() || undefined,
    });
    setCreating(false);
    if (!created) return;
    setOpen(false);
    setName("");
    setPath("/");
    await mutate();
    router.push(hrefForPath(created.path));
  }

  let sortedPages = useMemo(() => sortPublicationPages(pages), [pages]);
  let sortableIds = useMemo(() => sortedPages.map((p) => p.id), [sortedPages]);

  let sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    let { active, over } = event;
    if (!over || active.id === over.id || !publicationUri) return;

    let activeId = Number(active.id);
    let overId = Number(over.id);
    let oldIndex = sortedPages.findIndex((p) => p.id === activeId);
    let newIndex = sortedPages.findIndex((p) => p.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;

    let reordered = arrayMove(sortedPages, oldIndex, newIndex);
    let before = reordered[newIndex - 1]?.sort_order ?? null;
    let after = reordered[newIndex + 1]?.sort_order ?? null;
    let newSortOrder = generateKeyBetween(before, after);

    mutatePublicationData(mutate, (draft) => {
      let page = draft.publication?.publication_pages.find(
        (p) => p.id === activeId,
      );
      if (page) page.sort_order = newSortOrder;
    });

    reorderPublicationPages({
      publication_uri: publicationUri,
      page_id: activeId,
      sort_order: newSortOrder,
    }).then((result) => {
      if (!result.success) mutate();
    });
  }

  return (
    <nav className="publicationPagesNav border-t border-b border-border-light shrink-0 w-full sm:max-w-[calc(var(--page-width-units)*1.25)] mx-auto">
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2 overflow-x-auto w-full sm:max-w-(--page-width-units) mx-auto">
        <div className="flex items-center gap-1 grow min-w-0 overflow-x-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            measuring={{
              droppable: { strategy: MeasuringStrategy.Always },
            }}
            modifiers={[restrictToHorizontalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortableIds}
              strategy={horizontalListSortingStrategy}
            >
              {sortedPages.map((page) => (
                <SortableTab
                  key={page.id}
                  page={page}
                  href={hrefForPath(page.path)}
                  active={
                    decodeURIComponent(pathname) ===
                    decodeURIComponent(hrefForPath(page.path))
                  }
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
        <Popover
          asChild
          align="end"
          open={open}
          onOpenChange={setOpen}
          className="w-64"
          trigger={
            <ButtonSecondary compact>
              <AddTiny className="scale-90" />
              Page
            </ButtonSecondary>
          }
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <InputWithLabel
              label="Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              autoFocus
            />
            <InputWithLabel
              label="Path"
              type="text"
              value={path}
              onChange={(e) => setPath(e.currentTarget.value)}
              placeholder="/about"
            />
            <ButtonPrimary type="submit" disabled={creating}>
              {creating ? "Creating..." : "Create Page"}
            </ButtonPrimary>
          </form>
        </Popover>
      </div>
    </nav>
  );
}

function SortableTab(props: {
  page: SortablePage;
  href: string;
  active: boolean;
}) {
  let {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.page.id });

  let style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/sortable-tab flex items-center shrink-0 rounded-md ${
        isDragging ? "opacity-50" : ""
      } ${
        props.active
          ? "bg-accent-1 text-accent-2"
          : "text-secondary hover:bg-border-light"
      }`}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label="Drag to reorder"
        className="shrink-0 w-[9px] h-4 ml-1 cursor-grab touch-none opacity-0 group-hover/sortable-tab:opacity-100 focus:opacity-100"
        style={{
          maskImage: "var(--gripperSVG)",
          maskRepeat: "repeat",
          backgroundColor: "currentColor",
        }}
        {...attributes}
        {...listeners}
      />
      <SpeedyLink
        href={props.href}
        className="block pr-2 pl-1 py-1 rounded-md text-sm text-inherit hover:no-underline! select-none"
      >
        {props.page.title || props.page.path || "/"}
      </SpeedyLink>
    </div>
  );
}
