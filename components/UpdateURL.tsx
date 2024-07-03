"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function UpdateURL(props: { url: string }) {
  let router = useRouter();
  useEffect(() => {
    router.replace(props.url);
  }, [props.url, router]);
  return <></>;
}
