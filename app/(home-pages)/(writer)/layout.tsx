import { WriterShell } from "./WriterShell";

export default function WriterLayout(props: { children: React.ReactNode }) {
  return <WriterShell>{props.children}</WriterShell>;
}
