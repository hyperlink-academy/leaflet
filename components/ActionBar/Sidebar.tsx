import { Media } from "components/Media";

export function Sidebar(props: { children?: React.ReactNode }) {
  return (
    <Media mobile={false} className="h-full">
      <div className="flex flex-col h-full justify-between  mt-1">
        {props.children}
      </div>
    </Media>
  );
}
