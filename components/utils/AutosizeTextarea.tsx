import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
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
        className={`${styles["grow-wrap"]} ${props.className} `}
        data-replicated-value={props.value}
        style={props.style}
      >
        <textarea
          rows={1}
          {...props}
          ref={textarea}
          className="placeholder:text-tertiary bg-transparent"
        />
      </div>
    );
  },
);

export const AsyncValueAutosizeTextarea = forwardRef<
  HTMLTextAreaElement,
  Props
>((props: Props, ref) => {
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
