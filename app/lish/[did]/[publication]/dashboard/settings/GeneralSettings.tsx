import { useRef } from "react";
import { Input } from "components/Input";
import { AddTiny } from "components/Icons/AddTiny";

export function GeneralSettings(props: {
  nameValue: string;
  setNameValue: (v: string) => void;
  descriptionValue: string;
  setDescriptionValue: (v: string) => void;
  iconPreview: string | null;
  setIconPreview: (v: string | null) => void;
  setIconFile: (f: File | null) => void;
}) {
  let fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-bold text-primary">General Settings</h3>

      <div className="flex items-center justify-between gap-2">
        <p className="pl-0.5 pb-0.5 text-tertiary italic text-sm font-bold">
          Logo <span className="font-normal">(optional)</span>
        </p>
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer  ${props.iconPreview ? "border border-border-light hover:outline-border" : "border border-dotted border-accent-contrast hover:outline-accent-contrast"} selected-outline`}
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
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              props.setIconFile(file);
              const reader = new FileReader();
              reader.onload = (ev) => {
                props.setIconPreview(ev.target?.result as string);
              };
              reader.readAsDataURL(file);
            }
          }}
        />
      </div>

      <label>
        <p className="pl-0.5 pb-0.5 text-tertiary italic text-sm font-bold">
          Publication Name
        </p>
        <Input
          className="input-with-border w-full text-primary"
          type="text"
          id="pubName"
          value={props.nameValue}
          onChange={(e) => props.setNameValue(e.currentTarget.value)}
        />
      </label>

      <label>
        <p className="text-tertiary italic text-sm font-bold pl-0.5 pb-0.5">
          Description <span className="font-normal">(optional)</span>
        </p>
        <Input
          textarea
          className="input-with-border w-full text-primary"
          rows={3}
          id="pubDescription"
          value={props.descriptionValue}
          onChange={(e) => props.setDescriptionValue(e.currentTarget.value)}
        />
      </label>
    </section>
  );
}
