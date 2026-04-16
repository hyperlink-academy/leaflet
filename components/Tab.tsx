import { ExternalLinkTiny } from "./Icons/ExternalLinkTiny";

export const Tab = (props: {
  name: string;
  icon?: React.ReactNode;
  selected: boolean;
  onSelect: () => void;
  onMouseEnter?: () => void;
  onPointerDown?: () => void;
  href?: string;
}) => {
  return (
    <div
      className={`pubTabs px-1 py-0 flex gap-1 items-center rounded-md hover:cursor-pointer ${props.selected ? "text-accent-2 bg-accent-1 font-bold -mb-px" : "text-secondary"}`}
      onClick={() => props.onSelect()}
      onMouseEnter={props.onMouseEnter}
      onPointerDown={props.onPointerDown}
      aria-label={props.icon ? props.name : undefined}
    >
      {props.icon ? props.icon : props.name}
      {props.href && <ExternalLinkTiny />}
    </div>
  );
};
