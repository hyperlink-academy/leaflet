import { CheckboxChecked, CheckboxEmpty } from "./Icons";

export function Checkbox(props: {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  children: React.ReactNode;
  checkboxEmptyClassName?: string;
  checkboxCheckedClassName?: string;
}) {
  return (
    <label
      className={`flex w-full gap-2 items-start cursor-pointer ${props.checked ? "text-primary font-bold " : " text-tertiary font-normal"}`}
    >
      <input
        type="checkbox"
        checked={props.checked}
        className="hidden"
        onChange={(e) => props.onChange(e)}
      />
      {!props.checked ? (
        <CheckboxEmpty
          className={`shrink-0 mt-[6px] text-tertiary ${props.checkboxEmptyClassName}`}
        />
      ) : (
        <CheckboxChecked
          className={`shrink-0 mt-[6px] text-accent-contrast ${props.checkboxCheckedClassName}`}
        />
      )}
      {props.children}
    </label>
  );
}
