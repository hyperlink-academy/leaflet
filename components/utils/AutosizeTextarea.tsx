import { forwardRef, useImperativeHandle, useRef } from "react";
import styles from "./textarea-styles.module.css";

type Props = React.DetailedHTMLProps<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  HTMLTextAreaElement
>;
export const AutosizeTextarea = forwardRef<HTMLTextAreaElement, Props>(
  (props: Props, ref) => {
    let textarea = useRef<HTMLTextAreaElement | null>(null);
    useImperativeHandle(ref, () => textarea.current as HTMLTextAreaElement);

    return (
      <div
        className={`${styles["grow-wrap"]} ${props.className}`}
        data-replicated-value={props.value}
        style={props.style}
      >
        <textarea rows={1} {...props} ref={textarea} />
      </div>
    );
  },
);
AutosizeTextarea.displayName = "Textarea";
