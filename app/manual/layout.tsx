import { ManualShell } from "./ManualShell";

export const metadata = {
  title: {
    default: "Leaflet Manual",
    template: "%s · Leaflet Manual",
  },
};

export default function ManualLayout(props: { children: React.ReactNode }) {
  return <ManualShell>{props.children}</ManualShell>;
}
