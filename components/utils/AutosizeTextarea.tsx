import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import styles from "./textarea-styles.module.css";

export type AutosizeTextareaProps = React.DetailedHTMLProps<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  HTMLTextAreaElement
> & { noWrap?: boolean };
export const AutosizeTextarea = forwardRef<
  HTMLTextAreaElement,
  AutosizeTextareaProps
>((props: AutosizeTextareaProps & { noWrap?: boolean }, ref) => {
  let textarea = useRef<HTMLTextAreaElement | null>(null);
  let { noWrap, ...rest } = props;
  useImperativeHandle(ref, () => textarea.current as HTMLTextAreaElement);

  return (
    <div
      className={`${styles["grow-wrap"]} ${props.className} ${noWrap ? styles["no-wrap"] : ""}`}
      data-replicated-value={props.value}
      style={props.style}
    >
      <textarea
        rows={1}
        {...rest}
        ref={textarea}
        className={`placeholder:text-tertiary bg-transparent ${props.className}`}
      />
    </div>
  );
});

export const AsyncValueAutosizeTextarea = forwardRef<
  HTMLTextAreaElement,
  AutosizeTextareaProps
>((props: AutosizeTextareaProps, ref) => {
  let [intermediateState, setIntermediateState] = useState(
    props.value as string,
  );

  useEffect(() => {
    setIntermediateState(props.value as string);
  }, [props.value]);

  return (
    <AutosizeTextarea
      {...props}
      ref={ref}
      value={intermediateState}
      onChange={async (e) => {
        if (!props.onChange) return;
        setIntermediateState(e.currentTarget.value);
        await Promise.all([props.onChange(e)]);
      }}
    />
  );
});

AutosizeTextarea.displayName = "Textarea";
