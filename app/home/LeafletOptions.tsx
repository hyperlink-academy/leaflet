"use client";
import {
  DeleteSmall,
  HideSmall,
  MoreOptionsTiny,
  TemplateRemoveSmall,
  TemplateSmall,
} from "components/Icons";
import { Menu, MenuItem } from "components/Layout";
import { PermissionToken } from "src/replicache";
import { mutate } from "swr";
import { hideDoc } from "./storage";
import { useState } from "react";
import { ButtonPrimary } from "components/Buttons";
import { useTemplateState } from "./CreateNewButton";
import { Item } from "@radix-ui/react-dropdown-menu";
import { useSmoker } from "components/Toast";

export const LeafletOptions = (props: {
  leaflet: PermissionToken;
  isTemplate: boolean;
}) => {
  let [state, setState] = useState<"normal" | "template">("normal");
  let [open, setOpen] = useState(false);
  let smoker = useSmoker();
  return (
    <>
      <Menu
        open={open}
        align="end"
        onOpenChange={(o) => {
          setOpen(o);
          setState("normal");
        }}
        trigger={
          <div className="bg-accent-1 text-accent-2 px-2 py-1 border border-accent-2 rounded-md">
            <MoreOptionsTiny />
          </div>
        }
      >
        {state === "normal" ? (
          <>
            {!props.isTemplate ? (
              <MenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setState("template");
                }}
              >
                <TemplateSmall /> Designate as Template
              </MenuItem>
            ) : (
              <MenuItem
                onSelect={(e) => {
                  useTemplateState.getState().removeTemplate(props.leaflet);
                  let newLeafletButton =
                    document.getElementById("new-leaflet-button");
                  if (!newLeafletButton) return;
                  let rect = newLeafletButton.getBoundingClientRect();
                  smoker({
                    static: true,
                    text: <strong>Removed template!</strong>,
                    position: {
                      y: rect.top,
                      x: rect.right + 5,
                    },
                  });
                }}
              >
                <TemplateRemoveSmall /> Remove from Templates
              </MenuItem>
            )}
            <MenuItem
              onSelect={() => {
                hideDoc(props.leaflet);
                mutate("leaflets");
              }}
            >
              <HideSmall />
              Remove from home
            </MenuItem>
          </>
        ) : state === "template" ? (
          <AddTemplateForm
            leaflet={props.leaflet}
            close={() => setOpen(false)}
          />
        ) : null}
      </Menu>
    </>
  );
};

const AddTemplateForm = (props: {
  leaflet: PermissionToken;
  close: () => void;
}) => {
  let [name, setName] = useState("");
  let smoker = useSmoker();
  return (
    <div className="flex flex-col gap-2 px-3 py-1">
      <label className="font-bold flex flex-col gap-1 text-secondary">
        Template Name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          type="text"
          className=" text-primary font-normal border border-border rounded-md outline-none px-2 py-1 w-64"
        />
      </label>

      <ButtonPrimary
        onClick={() => {
          useTemplateState.getState().addTemplate({
            name,
            id: props.leaflet.id,
          });
          let newLeafletButton = document.getElementById("new-leaflet-button");
          if (!newLeafletButton) return;
          let rect = newLeafletButton.getBoundingClientRect();
          smoker({
            static: true,
            text: <strong>Added {name}!</strong>,
            position: {
              y: rect.top,
              x: rect.right + 5,
            },
          });
          props.close();
        }}
        className="place-self-end"
      >
        Add Template
      </ButtonPrimary>
    </div>
  );
};
