import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { theme } from "tailwind.config";
import { PopoverArrow } from "./Icons";
import {
  CardThemeProvider,
  NestedCardThemeProvider,
} from "./ThemeManager/ThemeProvider";
import { Input } from "./Input";

export const Separator = (props: { classname?: string }) => {
  return (
    <div className={`min-h-full border-r border-border ${props.classname}`} />
  );
};

export const Menu = (props: {
  open?: boolean;
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "end" | "center";
  background?: string;
  border?: string;
  className?: string;
  onOpenChange?: (o: boolean) => void;
}) => {
  return (
    <DropdownMenu.Root onOpenChange={props.onOpenChange} open={props.open}>
      <DropdownMenu.Trigger>{props.trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <NestedCardThemeProvider>
          <DropdownMenu.Content
            align={props.align ? props.align : "center"}
            sideOffset={4}
            collisionPadding={16}
            className={`dropdownMenu z-20 bg-bg-page flex flex-col py-1 gap-0.5 border border-border rounded-md shadow-md ${props.className}`}
          >
            {props.children}
            <DropdownMenu.Arrow
              asChild
              width={16}
              height={8}
              viewBox="0 0 16 8"
            >
              <PopoverArrow
                arrowFill={
                  props.background ? props.background : theme.colors["bg-page"]
                }
                arrowStroke={
                  props.border ? props.border : theme.colors["border"]
                }
              />
            </DropdownMenu.Arrow>
          </DropdownMenu.Content>
        </NestedCardThemeProvider>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export const MenuItem = (props: {
  children?: React.ReactNode;
  className?: string;
  onSelect: (e: Event) => void;
  id?: string;
}) => {
  return (
    <DropdownMenu.Item
      id={props.id}
      onSelect={(event) => {
        props.onSelect(event);
      }}
      className={`
        MenuItem
        font-bold z-10 py-1 px-3
        text-left text-secondary
        flex gap-2
        data-[highlighted]:bg-border-light data-[highlighted]:text-secondary
        hover:bg-border-light hover:text-secondary
        outline-none
        cursor-pointer
        ${props.className}
        `}
    >
      {props.children}
    </DropdownMenu.Item>
  );
};

export const InputWithLabel = (
  props: {
    label: string;
  } & JSX.IntrinsicElements["input"],
) => {
  let { label, ...inputProps } = props;
  return (
    <label className="text-xs text-tertiary font-bold italic input-with-border flex flex-col w-full">
      {props.label}
      <Input
        {...inputProps}
        className={`appearance-none w-full font-normal bg-transparent text-base text-primary focus:outline-0 ${props.className}`}
      />
    </label>
  );
};

export const ShortcutKey = (props: { children: React.ReactNode }) => {
  return (
    <span>
      <code className="min-w-6 w-fit text-xs text-primary bg-border-light border border-secondary rounded-md px-0.5  flex justify-center font-bold ">
        {props.children}
      </code>
    </span>
  );
};
