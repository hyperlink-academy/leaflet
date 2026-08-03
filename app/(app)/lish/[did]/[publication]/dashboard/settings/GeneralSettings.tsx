import { useRef } from "react";
import { Input } from "components/Input";
import { AddTiny } from "components/Icons/AddTiny";
import { SettingsSection } from "components/SettingsLayout";
import { encodeIconFile } from "src/utils/imageEncoding";
import { Separator } from "components/Layout";

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
  let fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <SettingsSection title="General Settings">
      <div className="flex flex-col gap-2 pb-2">
        <p className=" text-secondary  font-bold">
          Logo <span className="font-normal">(optional)</span>
        </p>
        <div className="flex flex-col items-center gap-1 w-fit">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center cursor-pointer  ${props.iconPreview ? "border border-border-light hover:outline-border" : "border border-dotted border-accent-contrast hover:outline-accent-contrast"} selected-outline`}
            onClick={() => fileInputRef.current?.click()}
          >
            {props.iconPreview ? (
              <img
                src={props.iconPreview}
                alt="Logo preview"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <AddTiny className="text-accent-1" />
            )}
          </div>
          {props.iconPreview && (
            <div className="flex gap-2 text-sm text-accent-contrast items-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                Change
              </button>
              <Separator classname="h-4!" />
              <button type="button" onClick={props.removeIcon}>
                Remove
              </button>
            </div>
          )}
        </div>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
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
      </div>

      <label>
        <p className="text-secondary pt-3 font-bold">Publication Name</p>
        <Input
          className="input-with-border w-full text-primary max-w-prose"
          type="text"
          id="pubName"
          value={props.nameValue}
          onChange={(e) => props.setNameValue(e.currentTarget.value)}
        />
      </label>

      <label>
        <p className="text-secondary pt-3 font-bold">
          Description <span className="font-normal">(optional)</span>
        </p>
        <Input
          textarea
          className="input-with-border w-full text-primary max-w-prose"
          rows={3}
          id="pubDescription"
          value={props.descriptionValue}
          onChange={(e) => props.setDescriptionValue(e.currentTarget.value)}
        />
      </label>
    </SettingsSection>
  );
}
