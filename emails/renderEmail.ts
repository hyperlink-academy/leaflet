import { render } from "@react-email/render";
import type { ReactElement } from "react";

export async function renderEmail(element: ReactElement) {
  return (await render(element)).replace(
    /<link rel="preload" as="image"[^>]*>/g,
    "",
  );
}
