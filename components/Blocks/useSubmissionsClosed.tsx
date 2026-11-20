"use client";
import { useEffect, useState } from "react";
import { useLocalizedDate } from "src/hooks/useLocalizedDate";
import { useHasPageLoaded } from "components/InitialPageLoadProvider";
import { submissionsClosed } from "src/submissionsClose";

// Whether a questions or reply block has passed its closesAt, flipping while
// the page is open.
export function useSubmissionsClosed(closesAt: string | undefined) {
  let [closed, setClosed] = useState(() => submissionsClosed(closesAt));
  useEffect(() => {
    setClosed(submissionsClosed(closesAt));
    if (!closesAt) return;
    let remaining = new Date(closesAt).getTime() - Date.now();
    // setTimeout overflows past ~24.8 days and would fire immediately
    if (isNaN(remaining) || remaining <= 0 || remaining > 2 ** 31 - 1) return;
    let timeout = setTimeout(() => setClosed(true), remaining);
    return () => clearTimeout(timeout);
  }, [closesAt]);
  return closed;
}

export function useClosesAtLabel(closesAt: string) {
  let loaded = useHasPageLoaded();
  return useLocalizedDate(closesAt, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(loaded ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

// For readers, beside who can submit
export function ClosesAtNotice(props: { closesAt: string }) {
  let label = useClosesAtLabel(props.closesAt);
  return <>Submissions close at {label}.</>;
}
