import {
  CheckboxChecked,
  CheckboxEmpty,
  RadioChecked,
  RadioEmpty,
} from "./Icons";

export function Checkbox(props: {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  children: React.ReactNode;
  checkboxEmptyClassName?: string;
  checkboxCheckedClassName?: string;
}) {
  return (
    <label
      className={`flex gap-2 items-start cursor-pointer shrink-0 ${props.checked ? "text-primary font-bold " : " text-tertiary font-normal"}`}
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

export function Radio(props: {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  id: string;
  name: string;
  value: string;
  children: React.ReactNode;
  radioEmptyClassName?: string;
  radioCheckedClassName?: string;
}) {
  return (
    <label
      htmlFor={props.id}
      className={`flex gap-2 items-start cursor-pointer shrink-0 ${props.checked ? "text-primary font-bold " : " text-tertiary font-normal"}`}
    >
      <input
        type="radio"
        name={props.name}
        id={props.id}
        value={props.value}
        checked={props.checked}
        className="hidden"
        onChange={(e) => props.onChange(e)}
      />
      {!props.checked ? (
        <RadioEmpty
          className={`shrink-0 mt-[6px] text-tertiary ${props.radioEmptyClassName}`}
        />
      ) : (
        <RadioChecked
          className={`shrink-0 mt-[6px] text-accent-contrast ${props.radioCheckedClassName}`}
        />
      )}
      {props.children}
    </label>
  );
}
