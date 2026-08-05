import { useCardBorderHidden } from "./Pages/useCardBorderHidden";
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
  className?: string;
  title?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  let cardBorderHidden = useCardBorderHidden();
  return (
    <div
      className={`${cardBorderHidden ? "light-container" : "opaque-container"} flex flex-col gap-2 p-3 pb-4 sm:px-4 ${props.className || ""}`}
    >
      <div className="flex justify-between items-center">
        {props.title && <h3>{props.title}</h3>}
        {props.action && props.action}
      </div>
      <div className="flex flex-col gap-4 text-secondary leading-snug">
        {props.children}
      </div>
    </div>
  );
}

export const InputSetting = (props: {
  children: React.ReactNode;
  label: string;
  optional?: boolean;
  helpText?: React.ReactNode;
  htmlFor?: string;
}) => {
  return (
    <label
      htmlFor={props.htmlFor}
      className="setting flex flex-col gap-1 md:flex-row md:gap-4"
    >
      <p className="basis-1/4 shrink-0 mt-1 text-secondary font-bold  ">
        {props.label}{" "}
        {props.optional && <span className="font-normal">(optional)</span>}
      </p>
      <div className="flex flex-col grow min-w-0">
        {props.children}
        {props.helpText && (
          <p className="text-sm text-tertiary pt-0">{props.helpText}</p>
        )}
      </div>
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
