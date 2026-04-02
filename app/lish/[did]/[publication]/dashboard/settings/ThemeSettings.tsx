import { GoToArrow } from "components/Icons/GoToArrow";

export function ThemeSettings(props: { onOpenTheme: () => void }) {
  return (
    <>
      <h3 className="font-bold text-primary">Theme and Layout</h3>
      <button
        type="button"
        className="text-left flex gap-2 items-center text-accent-contrast font-bold  w-fit"
        onClick={props.onOpenTheme}
      >
        Customize Theme <GoToArrow />
      </button>
    </>
  );
}
