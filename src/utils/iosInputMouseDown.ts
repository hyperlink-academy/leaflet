import { isIOS } from "@react-aria/utils";

export function onMouseDown(e: React.MouseEvent<HTMLInputElement>) {
  if (!isIOS()) return;
  e.preventDefault();
  let target = e.currentTarget;
  target.style.transform = "translateY(-2000px)";
  if (target.type === "text") target.setSelectionRange(0, target.value.length);
  target.focus();
  requestAnimationFrame(() => {
    target.style.transform = "";
  });
}
