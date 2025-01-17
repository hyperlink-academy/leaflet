"use client";
import { useRSVPData } from "src/hooks/useRSVPData";
import { ButtonTertiary } from "components/Buttons";
import { Popover } from "components/Popover";

export function Attendees(props: { entityID: string; className?: string }) {
  let { data } = useRSVPData();
  let attendees =
    data?.rsvps?.filter((rsvp) => rsvp.entity === props.entityID) || [];
  let going = attendees.filter((rsvp) => rsvp.status === "GOING");
  let maybe = attendees.filter((rsvp) => rsvp.status === "MAYBE");
  let notGoing = attendees.filter((rsvp) => rsvp.status === "NOT_GOING");

  return (
    <Popover
      align="start"
      className="text-sm text-secondary flex flex-col gap-2 max-w-sm"
      asChild
      trigger={
        going.length === 0 && maybe.length === 0 ? (
          <button
            className={`text-sm font-normal w-max text-tertiary italic hover:underline ${props.className}`}
          >
            No RSVPs yet
          </button>
        ) : (
          <ButtonTertiary className={`text-sm font-normal ${props.className}`}>
            {going.length > 0 &&
              `${going.reduce((acc, g) => acc + 1 + g.plus_ones, 0)} Going`}
            {maybe.length > 0 &&
              `${going.length > 0 ? ", " : ""}${maybe.reduce((acc, m) => acc + 1 + m.plus_ones, 0)} Maybe`}
          </ButtonTertiary>
        )
      }
    >
      {going.length === 0 && maybe.length === 0 && notGoing.length === 0 && (
        <div className="text-tertiary italic">No RSVPs yet</div>
      )}
      <AttendeeStatusList rsvps={going} title="Going" />
      <AttendeeStatusList rsvps={maybe} title="Maybe" />
      <AttendeeStatusList rsvps={notGoing} title="Can't Go" />
    </Popover>
  );
}

function AttendeeStatusList(props: {
  rsvps: Array<{
    name: string;
    phone_number?: string;
    plus_ones: number;
    status: string;
  }>;
  title: string;
}) {
  if (props.rsvps.length === 0) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <div className="font-bold text-tertiary">
        {props.title} ({props.rsvps.length})
      </div>
      {props.rsvps.map((rsvp) => (
        <div key={rsvp.phone_number}>
          {rsvp.name} {rsvp.plus_ones > 0 ? `+${rsvp.plus_ones}` : ""}
        </div>
      ))}
    </div>
  );
}
