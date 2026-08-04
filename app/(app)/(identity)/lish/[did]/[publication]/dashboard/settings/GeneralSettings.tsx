import React from "react";
import { Input } from "components/Input";
import { AddTiny } from "components/Icons/AddTiny";
import { SettingsSection, InputSetting } from "components/SettingsLayout";
import { encodeIconFile } from "src/utils/imageEncoding";
import { Separator } from "components/Layout";
import { DeleteTiny } from "components/Icons/DeleteTiny";

export function GeneralSettings(props: {
  nameValue: string;
  setNameValue: (v: string) => void;
  descriptionValue: string;
  setDescriptionValue: (v: string) => void;
  iconPreview: string | null;
  setIcon: (file: File, preview: string) => void;
  removeIcon: () => void;
  onIconError: (message: string) => void;
}) {
  return (
    <SettingsSection title="General Settings">
      <InputSetting label="Logo" optional htmlFor="pub-icon-upload">
        <div
          className={`relative w-16 h-16 rounded-full flex place-items-center justify-center outline-2 cursor-pointer outline-transparent outline-offset-1 hover:outline-accent-contrast`}
        >
          {props.iconPreview ? (
            <img
              src={props.iconPreview}
              alt="Logo preview"
              className="w-full h-full rounded-full object-cover border-border-light"
            />
          ) : (
            <div
              className={`w-full h-full rounded-full border border-dashed border-accent-contrast `}
            />
          )}
          <div className="absolute top-0 right-0 bg-accent-1 rounded-full text-accent-2 h-5 w-5 flex justify-center items-center">
            {props.iconPreview ? (
              <button type="button" onClick={props.removeIcon}>
                <DeleteTiny />
              </button>
            ) : (
              <AddTiny className="text-accent-2" />
            )}
          </div>
        </div>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          id="pub-icon-upload"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.currentTarget.value = "";
            if (!file) return;
            try {
              const processed = await encodeIconFile(file);
              props.setIcon(processed, URL.createObjectURL(processed));
            } catch {
              props.onIconError(
                "We couldn't process that image. Try a JPEG, PNG, or WebP.",
              );
            }
          }}
        />
      </InputSetting>

      <InputSetting label="Publication Name">
        <Input
          className="input-with-border w-full text-primary "
          type="text"
          id="pubName"
          value={props.nameValue}
          onChange={(e) => props.setNameValue(e.currentTarget.value)}
        />
      </InputSetting>

      <InputSetting label="Description" optional>
        <Input
          textarea
          className="input-with-border w-full text-primary "
          rows={3}
          id="pubDescription"
          value={props.descriptionValue}
          onChange={(e) => props.setDescriptionValue(e.currentTarget.value)}
        />
      </InputSetting>
    </SettingsSection>
  );
}
