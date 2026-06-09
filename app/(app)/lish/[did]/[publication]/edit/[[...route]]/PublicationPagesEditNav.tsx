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
import {
  restrictToHorizontalAxis,
  restrictToParentElement,
} from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { generateKeyBetween } from "fractional-indexing";
import {
  ButtonPrimary,
  ButtonSecondary,
  ButtonTertiary,
} from "components/Buttons";
import { InputWithLabel } from "components/Input";
import { Popover } from "components/Popover";
import { AddTiny } from "components/Icons/AddTiny";
import { EditTiny } from "components/Icons/EditTiny";
import { createPublicationPage } from "actions/createPublicationPage";
import { deletePublicationPage } from "actions/deletePublicationPage";
import { updatePublicationPage } from "actions/updatePublicationPage";
import { reorderPublicationPages } from "actions/reorderPublicationPages";
import {
  usePublicationData,
  mutatePublicationData,
  useNormalizedPublicationRecord,
} from "../../dashboard/PublicationSWRProvider";
import { sortPublicationPages } from "../../sortPublicationPages";
import { PublicationNavSubscribe } from "../../PublicationNavSubscribe";
import { PublicationNavTabLink } from "../../PublicationNavTabLink";
import { useNavBackgroundFade } from "../../useNavBackgroundFade";
import { DotLoader } from "components/utils/DotLoader";
import { useToaster } from "components/Toast";
import { Checkbox } from "components/Checkbox";
import {
  isExternalLink,
  normalizeExternalLink,
} from "src/utils/externalPublicationLink";
import { ExternalLinkTiny } from "components/Icons/ExternalLinkTiny";

// Turn arbitrary user input into a slug that is safe to use as the path
// segment of a URL: lowercase, ascii letters/numbers/dashes only, no spaces
// or characters that would need percent-encoding.
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

type SortablePage = {
  id: number;
  path: string | null;
  title: string;
  sort_order: string;
};

// Returns a checker that reports whether a path is already used by another
// page in this publication. Paths are compared in their cleaned form so e.g.
// "About" and "/about" are treated as the same. Pass the current page's id as
// `excludePageId` so editing a page and keeping its own path isn't a conflict.
function useIsPathInUse() {
  let { data } = usePublicationData();
  let pages = data?.publication?.publication_pages ?? [];
  return (path: string | null, excludePageId?: number) => {
    let normalized = cleanPath(path ?? "") || "/";
    return pages.some(
      (p) =>
        p.id !== excludePageId &&
        (cleanPath(p.path ?? "") || "/") === normalized,
    );
  };
}

// Validate the user's path/url input for a tab and return the value to store
// in `path`, or null (after showing an error toast) if it's unusable. External
// link tabs store a full url; hosted pages store a cleaned relative path that
// must be unique within the publication.
function useResolveTabPath() {
  let toaster = useToaster();
  let isPathInUse = useIsPathInUse();
  return (
    input: string,
    external: boolean,
    excludePageId?: number,
  ): string | null => {
    if (external) {
      let url = normalizeExternalLink(input);
      if (!url) {
        toaster({ type: "error", content: "enter a valid url (https://…)" });
        return null;
      }
      return url;
    }
    if (isPathInUse(input, excludePageId)) {
      toaster({ type: "error", content: "path already in use!" });
      return null;
    }
    return cleanPath(input) || "";
  };
}

export function PublicationPagesEditNav(props: {
  did: string;
  publicationName: string;
  hideSubscribeInHeader?: boolean;
}) {
  let router = useRouter();
  let pathname = usePathname() ?? "";
  let { data, mutate } = usePublicationData();

  let pages = data?.publication?.publication_pages ?? [];
  let publicationUri = data?.publication?.uri;
  let publicationRecord = useNormalizedPublicationRecord();
  let newsletterMode =
    !!data?.publication?.publication_newsletter_settings?.enabled;
  let cardBorderHidden = !publicationRecord?.theme?.showPageBackground;
  let baseHref = `/lish/${props.did}/${props.publicationName}`;

  function hrefForPath(path: string | null) {
    let segment = path && path !== "/" ? path : "";
    return `${baseHref}/edit${segment}`;
  }

  let sortedPages = useMemo(() => sortPublicationPages(pages), [pages]);
  let sortableIds = useMemo(() => sortedPages.map((p) => p.id), [sortedPages]);

  let { navRef, bgOpacity } = useNavBackgroundFade(cardBorderHidden);

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
              {sortedPages.map((page, idx) => {
                let isActive =
                  decodeURIComponent(pathname) ===
                  decodeURIComponent(hrefForPath(page.path));
                let neighbor = sortedPages[idx - 1] ?? sortedPages[idx + 1];
                let redirectHrefOnDelete =
                  isActive && neighbor ? hrefForPath(neighbor.path) : null;
                return (
                  <SortableTab
                    key={page.id}
                    page={page}
                    href={hrefForPath(page.path)}
                    active={isActive}
                    publicationUri={publicationUri}
                    publicationUrl={publicationRecord?.url}
                    canDelete={sortedPages.length > 1}
                    onUpdated={(updated) => {
                      mutatePublicationData(mutate, (draft) => {
                        let p = draft.publication?.publication_pages.find(
                          (p) => p.id === page.id,
                        );
                        if (p) {
                          p.title = updated.title;
                          p.path = updated.path;
                        }
                      });
                      if (isActive && updated.path !== page.path)
                        router.push(hrefForPath(updated.path));
                    }}
                    onDeleted={() => {
                      mutatePublicationData(mutate, (draft) => {
                        let pages = draft.publication?.publication_pages;
                        if (!pages) return;
                        let i = pages.findIndex((p) => p.id === page.id);
                        if (i !== -1) pages.splice(i, 1);
                      });
                      if (redirectHrefOnDelete)
                        router.push(redirectHrefOnDelete);
                    }}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
          <AddPageButton
            publicationUri={publicationUri}
            publicationUrl={publicationRecord?.url}
            onCreated={async (created) => {
              await mutate();
              // External links have no editable page to navigate to — they just
              // appear in the nav once created.
              if (!isExternalLink(created.path))
                router.push(hrefForPath(created.path));
            }}
          />
        </div>
        {publicationUri && publicationRecord && props.hideSubscribeInHeader && (
          <div className="pointer-events-none">
            <PublicationNavSubscribe
              publicationUri={publicationUri}
              publicationUrl={publicationRecord.url}
              publicationName={publicationRecord.name}
              publicationDescription={publicationRecord.description}
              newsletterMode={newsletterMode}
            />
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
  publicationUri: string | undefined;
  publicationUrl: string | undefined;
  onCreated: (created: { path: string | null }) => void | Promise<void>;
}) {
  let resolveTabPath = useResolveTabPath();
  let [open, setOpen] = useState(false);
  let [creating, setCreating] = useState(false);
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
    if (creating || !props.publicationUri) return;

    let path_to_create = resolveTabPath(
      isExternal ? externalLink : path,
      isExternal,
    );
    if (path_to_create === null) return;

    setCreating(true);
    let created = await createPublicationPage({
      publication_uri: props.publicationUri,
      path: path_to_create,
      title: name.trim() || undefined,
    });
    setCreating(false);
    if (!created) return;
    setOpen(false);
    setName("");
    setPath("");
    setPathLinked(true);
    await props.onCreated(created);
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
            creating ||
            !name.trim() ||
            (isExternal ? !externalLink.trim() : !path.trim())
          }
          fullWidth
          compact
          className="mt-2"
        >
          {creating ? <DotLoader /> : "Create Page"}
        </ButtonPrimary>
      </form>
    </Popover>
  );
}

function SortableTab(props: {
  page: SortablePage;
  href: string;
  active: boolean;
  publicationUri: string | undefined;
  publicationUrl: string | undefined;

  canDelete: boolean;
  onUpdated: (updated: { title: string; path: string }) => void;
  onDeleted: () => void;
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
  let resolveTabPath = useResolveTabPath();
  let external = isExternalLink(props.page.path);
  let [popoverOpen, setPopoverOpen] = useState(false);
  let [mode, setMode] = useState<"edit" | "confirm">("edit");
  let [name, setName] = useState(props.page.title);
  let [path, setPath] = useState(props.page.path ?? "/");
  let [saving, setSaving] = useState(false);
  let [deleting, setDeleting] = useState(false);

  let style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 1 : undefined,
  };
  function handleOpenChange(o: boolean) {
    setPopoverOpen(o);
    if (o) {
      setName(props.page.title);
      setPath(props.page.path ?? "/");
      setMode("edit");
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!props.publicationUri || saving) return;

    let nextPath = resolveTabPath(path, external, props.page.id);
    if (nextPath === null) return;

    let trimmedTitle = name.trim();
    setSaving(true);
    let result = await updatePublicationPage({
      publication_uri: props.publicationUri,
      page_id: props.page.id,
      title: trimmedTitle,
      path: nextPath,
    });
    setSaving(false);
    if (!result.success) return;
    setPopoverOpen(false);
    props.onUpdated({ title: trimmedTitle, path: nextPath });
  }

  async function handleDelete() {
    if (!props.publicationUri || deleting) return;
    setDeleting(true);
    let result = await deletePublicationPage({
      publication_uri: props.publicationUri,
      page_id: props.page.id,
    });
    setDeleting(false);
    if (!result.success) return;
    setPopoverOpen(false);
    props.onDeleted();
  }

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
      <PublicationNavTabLink
        href={external && props.page.path ? props.page.path : props.href}
        external={external}
        active={props.active}
      >
        {props.page.title || props.page.path || "/"}{" "}
        {external && <ExternalLinkTiny />}
      </PublicationNavTabLink>
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

            <ButtonPrimary type="submit" disabled={saving} fullWidth compact>
              {saving ? "Saving..." : "Save"}
            </ButtonPrimary>
            {props.canDelete && (
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
                {props.page.title || props.page.path || "this page"}
              </div>
            </div>
            <div className="flex gap-2 justify-center items-center pb-1">
              <ButtonTertiary type="button" onClick={() => setMode("edit")}>
                Nevermind
              </ButtonTertiary>
              <ButtonPrimary onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete"}
              </ButtonPrimary>
            </div>
          </div>
        )}
      </Popover>
    </div>
  );
}
