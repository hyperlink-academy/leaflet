import { ButtonPrimary } from "components/Buttons";
import { Media } from "components/Media";

export function Sidebar(props: { children?: React.ReactNode }) {
  return (
    <Media mobile={false}>
      <div className="flex flex-col justify-between  mt-1 border rounded-md border-bg-page bg-bg-page bg-opacity-50 h-fit items-center py-1 px-0.5 ">
        {props.children}
      </div>
    </Media>
  );
}

export function SidebarButton(props: {
  icon: React.ReactNode;
  content: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
}) {
  return <button>{props.icon}</button>;
}
