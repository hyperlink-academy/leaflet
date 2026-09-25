"use client";
import { useReaderPostViewer } from "src/useReaderPostViewer";
import { PostViewer } from "./PostViewer";

export function ReaderContentArea(props: { children: React.ReactNode }) {
  let framed = useReaderPostViewer((s) => s.index !== null);

  // Same box as the dashboardPageContent column it stands in for, so both
  // states get the same slot out of DashboardShell's flex row.
  return (
    <div className="readerContentArea relative w-full h-full">
      {!framed && props.children}
      <PostViewer />
    </div>
  );
}
