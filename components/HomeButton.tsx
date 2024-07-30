import Link from "next/link";
import { useEntitySetContext } from "./EntitySetProvider";

export function HomeButton() {
  let entity_set = useEntitySetContext();
  if (!entity_set.permissions.write) return;
  return <Link href="/home">home</Link>;
}
