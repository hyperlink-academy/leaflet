"use client";
import { getRSVPData } from "actions/getRSVPData";
import { SWRConfig } from "swr";

export function RSVPDataProvider(props: {
  data: Awaited<ReturnType<typeof getRSVPData>>;
  children: React.ReactNode;
}) {
  return (
    <SWRConfig value={{ fallback: { rsvp_data: props.data } }}>
      {props.children}
    </SWRConfig>
  );
}
