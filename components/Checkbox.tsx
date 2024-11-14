import { CheckboxChecked, CheckboxEmpty } from "./Icons";

export function Checkbox(props: {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="px-3 pb-3 flex gap-2 items-start cursor-pointer">
      <input
        type="checkbox"
        checked={props.checked}
        className="hidden"
        onChange={(e) => props.onChange(e)}
      />
      {!props.checked ? (
        <CheckboxEmpty className="shrink-0 mt-1 text-[#595959]" />
      ) : (
        <CheckboxChecked className="shrink-0 mt-1 text-[#595959]" />
      )}
      {props.children}
    </label>
  );
}
