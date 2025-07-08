import { theme } from "tailwind.config";

export const Toggle = (props: {
  toggleOn: boolean;
  setToggleOn: (s: boolean) => void;
}) => {
  return (
    <button
      className="toggle selected-outline transparent-outline flex items-center h-[20px] w-7 bg-test rounded-md border-border"
      style={{
        border: props.toggleOn
          ? "1px solid " + theme.colors["accent-2"]
          : "1px solid " + theme.colors["border-light"],
        justifyContent: props.toggleOn ? "flex-end" : "flex-start",
        background: props.toggleOn
          ? theme.colors["accent-1"]
          : theme.colors["tertiary"],
      }}
      onClick={() => props.setToggleOn(!props.toggleOn)}
    >
      <div
        className="h-[14px] w-[10px] m-0.5 rounded-[2px]"
        style={{
          background: props.toggleOn
            ? theme.colors["accent-2"]
            : theme.colors["border-light"],
        }}
      />
    </button>
  );
};
