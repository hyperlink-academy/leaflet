import { CheckboxChecked, CheckboxEmpty } from "./Icons";

export function Checkbox(props: {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  children: React.ReactNode;
  className?: string;
  small?: boolean;
}) {
  return (
    <label
      className={`flex w-full gap-2 items-start cursor-pointer ${props.className} ${props.checked ? "text-primary font-bold " : " text-tertiary font-normal"}`}
    >
      <input
        type="checkbox"
        checked={props.checked}
        className="hidden"
        onChange={(e) => props.onChange(e)}
      />
      {!props.checked ? (
        <CheckboxEmpty
          className={`shrink-0 text-tertiary ${props.small ? "mt-1" : "mt-[6px]"}`}
        />
      ) : (
        <CheckboxChecked
          className={`shrink-0 text-accent-contrast ${props.small ? "mt-1" : "mt-[6px]"}`}
        />
      )}
      {props.children}
    </label>
  );
}
