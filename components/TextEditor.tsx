import { useEffect, useState } from "react";

export function TextEditor(props: {
  value?: string;
  onChange: (value: string) => Promise<void>;
}) {
  let [intermediateState, setIntermediateState] = useState(props.value);
  useEffect(() => {
    setIntermediateState(props.value as string);
  }, [props.value]);
  return (
    <textarea
      value={intermediateState}
      onChange={async (e) => {
        setIntermediateState(e.currentTarget.value);
        await props.onChange(e.currentTarget.value);
      }}
    />
  );
}
