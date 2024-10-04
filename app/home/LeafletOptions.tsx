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

export const LeafletOptions = (props: {
  leaflet: PermissionToken;
  isTemplate: boolean;
}) => {
  let [state, setState] = useState<"normal" | "template">("normal");
  return (
    <>
      <Menu
        align="end"
        onOpenChange={() => {
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
              <MenuItem onSelect={(e) => {}}>
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
          <AddTemplateForm />
        ) : null}
      </Menu>
    </>
  );
};

const AddTemplateForm = () => {
  return (
    <form className="flex flex-col gap-2 px-3 py-1">
      <label className="font-bold flex flex-col gap-1 text-secondary">
        Template Name
        <input
          type="text"
          className=" text-primary font-normal border border-border rounded-md outline-none px-2 py-1 w-64"
        />
      </label>

      <ButtonPrimary className="place-self-end">Add Template</ButtonPrimary>
    </form>
  );
};
