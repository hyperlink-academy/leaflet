import { theme } from "tailwind.config";

export const Toggle = (props: {
  toggle: boolean;
  onToggle: () => void;
  disabledColor1?: string;
  disabledColor2?: string;
  children: React.ReactNode;
}) => {
  return (
    <button
      type="button"
      className="toggle flex gap-2 items-start justify-start text-left"
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
