"use client";

import { useEffect } from "react";

export function IdentitySetter(props: {
  cb: () => Promise<void>;
  call: boolean;
}) {
  useEffect(() => {
    if (props.call) props.cb();
  }, [props]);
  return null;
}
