"use client";

import { createNewLeaflet } from "actions/createNewLeaflet";
import { createNewLeafletFromTemplate } from "actions/createNewLeafletFromTemplate";
import { HoverButton } from "components/Buttons";
import {
  AddTiny,
  BlockCanvasPageSmall,
  BlockDocPageSmall,
  TemplateSmall,
} from "components/Icons";
import { Menu, MenuItem } from "components/Layout";
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
export const CreateNewLeafletButton = (props: {
  noLabelOnMobile?: boolean;
}) => {
  let templates = useTemplateState((s) => s.templates);
  return (
    <Menu
      trigger={
        <HoverButton
          id="new-leaflet-button"
          noLabelOnMobile={props.noLabelOnMobile}
          icon=<AddTiny className="m-1 shrink-0" />
          label="New Leaflet"
          background="bg-accent-1"
          text="text-accent-2"
        />
      }
    >
      <MenuItem
        onSelect={async () => {
          let id = await createNewLeaflet("doc", false);
          window.open(`/${id}`, "_blank");
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
          window.open(`/${id}`, "_blank");
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
              window.open(`/${id}`, "_blank");
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
