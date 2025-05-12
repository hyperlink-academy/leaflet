"use client";

import { createNewLeaflet } from "actions/createNewLeaflet";
import { createNewLeafletFromTemplate } from "actions/createNewLeafletFromTemplate";
import { ActionButton } from "components/ActionBar/ActionButton";
import { AddTiny } from "components/Icons/AddTiny";
import { BlockCanvasPageSmall } from "components/Icons/BlockCanvasPageSmall";
import { BlockDocPageSmall } from "components/Icons/BlockDocPageSmall";
import { TemplateSmall } from "components/Icons/TemplateSmall";
import { Menu, MenuItem } from "components/Layout";
import { useIsMobile } from "src/hooks/isMobile";
import { create } from "zustand";
import { combine, createJSONStorage, persist } from "zustand/middleware";

export const useTemplateState = create(
  persist(
    combine(
      {
        templates: [] as { id: string; name: string }[],
      },
      (set) => ({
        removeTemplate: (template: { id: string }) =>
          set((state) => {
            return {
              templates: state.templates.filter((t) => t.id !== template.id),
            };
          }),
        addTemplate: (template: { id: string; name: string }) =>
          set((state) => {
            if (state.templates.find((t) => t.id === template.id)) return state;
            return { templates: [...state.templates, template] };
          }),
      }),
    ),
    {
      name: "home-templates",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
export const CreateNewLeafletButton = (props: {}) => {
  let isMobile = useIsMobile();
  let templates = useTemplateState((s) => s.templates);
  let openNewLeaflet = (id: string) => {
    if (isMobile) {
      window.location.href = `/${id}?focusFirstBlock`;
    } else {
      window.open(`/${id}?focusFirstBlock`, "_blank");
    }
  };
  return (
    <Menu
      asChild
      trigger={
        <ActionButton
          id="new-leaflet-button"
          primary
          icon=<AddTiny className="m-1 shrink-0" />
          label="New Doc"
        />
      }
    >
      <MenuItem
        onSelect={async () => {
          let id = await createNewLeaflet("doc", false);
          openNewLeaflet(id);
        }}
      >
        <BlockDocPageSmall />{" "}
        <div className="flex flex-col">
          <div>New Doc</div>
          <div className="text-tertiary text-sm font-normal">
            A good ol&apos; text document
          </div>
        </div>
      </MenuItem>
      <MenuItem
        onSelect={async () => {
          let id = await createNewLeaflet("canvas", false);
          openNewLeaflet(id);
        }}
      >
        <BlockCanvasPageSmall />
        <div className="flex flex-col">
          New Canvas
          <div className="text-tertiary text-sm font-normal">
            A digital whiteboard
          </div>
        </div>
      </MenuItem>
      {templates.length > 0 && (
        <hr className="border-border-light mx-2 mb-0.5" />
      )}
      {templates.map((t) => {
        return (
          <MenuItem
            key={t.id}
            onSelect={async () => {
              let id = await createNewLeafletFromTemplate(t.id, false);
              if (!id.error) openNewLeaflet(id.id);
            }}
          >
            <TemplateSmall />
            New {t.name}
          </MenuItem>
        );
      })}
    </Menu>
  );
};
