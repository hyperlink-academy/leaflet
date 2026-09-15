import { theme } from "tailwind.config";

export const Toggle = (props: {
  toggle: boolean;
  fullWidth?: boolean;
  onToggle: () => void;
  disabledColor1?: string;
  disabledColor2?: string;
  children: React.ReactNode;
}) => {
  return (
    <button
      type="button"
      className={`toggle flex gap-2 text-left ${props.fullWidth ? "justify-between flex-row-reverse" : "items-start justify-start "}`}
      onClick={() => {
        props.onToggle();
      }}
    >
      <div className="h-6 flex place-items-center">
        <div
          className="selected-outline transparent-outline flex items-center h-[20px] w-6 rounded-md border-border"
          style={{
            border: props.toggle
              ? "1px solid " + theme.colors["accent-2"]
              : "1px solid " + props.disabledColor2 ||
                theme.colors["border-light"],
            justifyContent: props.toggle ? "flex-end" : "flex-start",
            background: props.toggle
              ? theme.colors["accent-1"]
              : props.disabledColor1 || theme.colors["tertiary"],
          }}
        >
          <div
            className="h-[14px] w-[10px] m-0.5 rounded-[2px]"
            style={{
              background: props.toggle
                ? theme.colors["accent-2"]
                : props.disabledColor2 || theme.colors["border-light"],
            }}
          />
        </div>
      </div>
      {props.children}
    </button>
  );
};

export const ToggleWithLabel = (props: {
  toggle: boolean;
  onToggle: () => void;
  label: React.ReactNode;
  helpText?: React.ReactNode;
  disabledColor1?: string;
  disabledColor2?: string;
}) => {
  return (
    <Toggle
      fullWidth
      toggle={props.toggle}
      onToggle={props.onToggle}
      disabledColor1={props.disabledColor1}
      disabledColor2={props.disabledColor2}
    >
      <div className="flex flex-col gap-0.5">
        <div
          className={`font-bold leading-snug ${props.toggle ? "" : "text-tertiary"}`}
        >
          {props.label}
        </div>
        {props.helpText && (
          <div className="text-sm text-tertiary leading-snug">
            {props.helpText}
          </div>
        )}
      </div>
    </Toggle>
  );
};
