import { Toggle } from "./Toggle";

export function SettingsPageLayout(props: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-6 w-full pb-8 ${props.className || ""}`}>
      {props.children}
    </div>
  );
}

export function SettingsSection(props: {
  title?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`${props.accent ? "accent-container" : "light-container"} flex flex-col gap-2 p-3 pb-4 sm:px-4 ${props.className || ""}`}
    >
      {props.title && (
        <>
          <h3>{props.title}</h3>
        </>
      )}
      <div className="flex flex-col gap-4">{props.children}</div>
    </div>
  );
}

export const InputSetting = (props: {
  children: React.ReactNode;
  label: string;
  optional?: boolean;
  htmlFor?: string;
}) => {
  return (
    <label
      htmlFor={props.htmlFor}
      className="setting flex flex-col gap-1 md:flex-row md:gap-4"
    >
      <p className="text-secondary font-bold basis-1/4 shrink-0 ">
        {props.label}
        {props.optional && <span className="font-normal"> (optional)</span>}
      </p>
      {props.children}
    </label>
  );
};

export const ToggleSetting = (props: {
  toggle: boolean;
  onToggle: () => void;
  label: string;
  helpText?: React.ReactNode;
}) => {
  return (
    <>
      <Toggle fullWidth toggle={props.toggle} onToggle={props.onToggle}>
        <div className="flex flex-col gap-0">
          <div className="font-bold text-secondary leading-snug">
            {props.label}
          </div>
          {props.helpText && (
            <div className="text-tertiary text-sm">{props.helpText}</div>
          )}
        </div>
      </Toggle>
      <hr className="last:hidden border-border-light" />
    </>
  );
};
