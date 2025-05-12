"use client";
import { useState } from "react";
import { useRSVPData } from "components/PageSWRDataProvider";
import { useEntitySetContext } from "components/EntitySetProvider";
import { ButtonPrimary } from "components/Buttons";
import { Popover } from "components/Popover";
import { theme } from "tailwind.config";
import { useToaster } from "components/Toast";
import { sendUpdateToRSVPS } from "actions/sendUpdateToRSVPS";
import { useReplicache } from "src/replicache";
import { Checkbox } from "components/Checkbox";
import { usePublishLink } from "components/ShareOptions";

export function SendUpdateButton(props: { entityID: string }) {
  let publishLink = usePublishLink();
  let { permissions } = useEntitySetContext();
  let { permission_token } = useReplicache();
  let [input, setInput] = useState("");
  let toaster = useToaster();
  let [open, setOpen] = useState(false);
  let [checkedRecipients, setCheckedRecipients] = useState({
    GOING: true,
    MAYBE: true,
    NOT_GOING: false,
  });

  let { data, mutate } = useRSVPData();
  let attendees =
    data?.rsvps?.filter((rsvp) => rsvp.entity === props.entityID) || [];
  let going = attendees.filter((rsvp) => rsvp.status === "GOING");
  let maybe = attendees.filter((rsvp) => rsvp.status === "MAYBE");
  let notGoing = attendees.filter((rsvp) => rsvp.status === "NOT_GOING");

  let allRecipients =
    ((checkedRecipients.GOING && going.length) || 0) +
    ((checkedRecipients.MAYBE && maybe.length) || 0) +
    ((checkedRecipients.NOT_GOING && notGoing.length) || 0);

  if (!!!permissions.write) return;
  return (
    <Popover
      asChild
      open={open}
      onOpenChange={(open) => setOpen(open)}
      trigger={
        <ButtonPrimary fullWidth className="mb-2">
          <UpdateSmall /> Send a Text Blast
        </ButtonPrimary>
      }
    >
      <div className="rsvpMessageComposer flex flex-col gap-2 w-[1000px] max-w-full sm:max-w-md">
        <div className="flex flex-col font-bold text-secondary">
          <h3>Send a Text Blast to</h3>
          <RecipientPicker
            checked={checkedRecipients}
            setChecked={setCheckedRecipients}
          />

          <textarea
            id="rsvp-message-input"
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !e.currentTarget.value)
                e.preventDefault();
            }}
            value={input}
            placeholder={
              allRecipients === 0
                ? "Send an event update…but first…share this Leaflet to invite people!"
                : "Send people an event update!"
            }
            onChange={(e) => {
              setInput(e.target.value);
            }}
            className="input-with-border w-full h-[150px] mt-3 pt-0.5 font-normal text-primary"
          />
        </div>
        <div className="flex justify-between items-start">
          <div
            className={`rsvpMessageCharCounter text-sm text-tertiary`}
            style={
              input.length > 300
                ? {
                    color: theme.colors["accent-1"],
                    fontWeight: "bold",
                  }
                : {
                    color: theme.colors["tertiary"],
                  }
            }
          >
            {input.length}/300 {input.length > 300 && " (too long!)"}
          </div>
          <ButtonPrimary
            disabled={
              input.length > 300 || input.length === 0 || allRecipients === 0
            }
            className="place-self-end "
            onClick={async () => {
              if (!permission_token || !publishLink) return;
              await sendUpdateToRSVPS(permission_token, {
                entity: props.entityID,
                message: input,
                eventName: document.title,
                sendto: checkedRecipients,
                publicLeafletID: publishLink,
              });
              toaster({
                content: <div className="font-bold">Update sent!</div>,
                type: "success",
              });
              setOpen(false);
            }}
          >
            Text {allRecipients} {allRecipients === 1 ? "Person" : "People"}!
          </ButtonPrimary>
        </div>
      </div>
    </Popover>
  );
}

const RecipientPicker = (props: {
  checked: { GOING: boolean; MAYBE: boolean; NOT_GOING: boolean };
  setChecked: (checked: {
    GOING: boolean;
    MAYBE: boolean;
    NOT_GOING: boolean;
  }) => void;
}) => {
  return (
    <div className="flex flex-col gap-0.5">
      {/* <small className="font-normal">
        Send a text to everyone who RSVP&apos;d:
      </small> */}
      <div className="flex gap-4 text-secondary">
        <Checkbox
          className="!w-fit"
          checked={props.checked.GOING}
          onChange={() => {
            props.setChecked({
              ...props.checked, // Spread the existing values
              GOING: !props.checked.GOING,
            });
          }}
        >
          Going
        </Checkbox>
        <Checkbox
          className="!w-fit"
          checked={props.checked.MAYBE}
          onChange={() => {
            props.setChecked({
              ...props.checked, // Spread the existing values
              MAYBE: !props.checked.MAYBE,
            });
          }}
        >
          Maybe
        </Checkbox>
        <Checkbox
          className="!w-fit"
          checked={props.checked.NOT_GOING}
          onChange={() => {
            props.setChecked({
              ...props.checked, // Spread the existing values
              NOT_GOING: !props.checked.NOT_GOING,
            });
          }}
        >
          Can&apos;t Go
        </Checkbox>
      </div>
    </div>
  );
};

const UpdateSmall = () => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.22186 7.92684C10.1774 6.18312 11.5332 4.90336 12.9251 4.2286C13.1335 4.12754 13.3416 4.04046 13.5484 3.96745C14.6049 3.60869 15.7766 3.54735 16.7819 4.09825C17.8692 4.69405 18.5671 5.88122 18.7476 7.41916C18.9279 8.95543 18.5788 10.7869 17.6233 12.5306C16.6678 14.2743 15.312 15.5541 13.9201 16.2288C12.5267 16.9043 11.1506 16.955 10.0633 16.3592C9.19584 15.8839 8.57626 15.0321 8.26951 13.9262C8.25817 13.8746 8.24668 13.8234 8.23523 13.7724L8.23523 13.7724C8.18078 13.5299 8.12744 13.2924 8.09762 13.0383C7.91733 11.502 8.26635 9.67055 9.22186 7.92684ZM9.46946 4.78715C9.67119 4.78662 9.8633 4.78121 10.0481 4.7711C9.3182 5.48646 8.66218 6.34702 8.12565 7.32615C7.55376 8.36979 7.16847 9.45536 6.96726 10.519C6.87184 10.3382 6.77397 10.1659 6.67468 10.0061C6.66248 9.63279 6.756 9.17519 6.92538 8.67954C7.12252 8.10267 7.40257 7.53025 7.65185 7.07532C7.87489 6.6683 8.26315 6.06477 8.68993 5.5499C8.9033 5.29248 9.11698 5.06859 9.31569 4.90418C9.37126 4.8582 9.42255 4.81949 9.46946 4.78715ZM8.11028 4.69028C7.79498 4.62946 7.4876 4.54412 7.23739 4.46669C6.91656 4.36741 6.66099 4.27202 6.54912 4.22896C6.41134 4.17536 6.19445 4.14 6.05859 4.21094C5.71409 4.39084 5.01295 4.92363 4.69271 5.51519C4.53469 5.8071 4.40424 6.2273 4.30596 6.64793C4.29259 6.70518 4.27708 6.76449 4.26123 6.82511L4.26123 6.82512L4.26122 6.82514C4.18998 7.09762 4.11179 7.39666 4.18884 7.65503C4.24062 7.82867 4.31432 7.93693 4.39162 8.00286C4.59287 8.12133 4.78982 8.24738 4.98348 8.37782C5.22591 8.54111 5.52054 8.75196 5.79607 8.98466C5.84667 8.7703 5.90975 8.55912 5.97911 8.35617C6.20171 7.70478 6.51068 7.07692 6.77488 6.59477C7.02425 6.1397 7.44733 5.482 7.92003 4.91174C7.98204 4.83692 8.04556 4.76282 8.11028 4.69028ZM4.21574 3.89626L4.62051 4.02189C4.3203 4.30946 4.01949 4.65825 3.8133 5.03912C3.59059 5.45053 3.43618 5.9753 3.33219 6.42041C3.30438 6.53942 3.27957 6.65546 3.25762 6.7656L2.81215 6.40882C2.81215 6.40882 2.81126 6.40681 2.80986 6.40423C2.79662 6.37992 2.73103 6.25944 2.74152 5.96321C2.75269 5.6481 2.85108 5.26172 3.04578 4.90642C3.25394 4.52653 3.50079 4.23769 3.73458 4.06623C3.95711 3.90302 4.11635 3.8793 4.21574 3.89626ZM5.25013 10.1776C5.49632 10.4247 5.83445 10.991 6.17145 11.7406C5.73841 12.4265 5.41616 12.6857 5.21838 12.7691C5.07131 12.8312 4.93508 12.822 4.70214 12.656C4.11675 12.2388 3.60414 11.8264 3.21764 11.4066C2.8298 10.9853 2.60401 10.594 2.53069 10.2224L2.52687 10.2031C2.4802 9.9669 2.45604 9.84466 2.51608 9.58542C2.57686 9.32295 2.72752 8.9236 3.07623 8.2506C3.19924 8.54228 3.38803 8.81394 3.66359 9.02041C3.77639 9.10493 3.89934 9.17816 4.02211 9.25128L4.02211 9.25128C4.11121 9.30434 4.20021 9.35735 4.28517 9.41458C4.61144 9.63434 4.98505 9.91153 5.25013 10.1776ZM1.49231 5.91896C1.47179 6.49822 1.63299 7.06591 2.09331 7.43458C1.64229 8.27701 1.40278 8.85224 1.2983 9.30341C1.17766 9.82436 1.24402 10.1596 1.29968 10.4408L1.30433 10.4643C1.43907 11.1472 1.82601 11.7405 2.29799 12.2532C2.77132 12.7673 3.36564 13.2385 3.9767 13.6739C4.42074 13.9904 5.0195 14.2097 5.70419 13.9209C6.06177 13.77 6.39891 13.496 6.72728 13.1045C6.81994 13.3603 6.90026 13.6093 6.96835 13.8644C7.28444 15.3377 8.1138 16.7163 9.46258 17.4554C10.998 18.2968 12.8155 18.1535 14.4654 17.3536C16.1168 16.5531 17.6539 15.0761 18.7195 13.1313C19.7852 11.1865 20.203 9.09618 19.9891 7.27346C19.7753 5.4524 18.918 3.84341 17.3826 3.00204C16.1201 2.31022 14.6669 2.28413 13.2729 2.74137C13.2652 2.74368 13.2574 2.74615 13.2497 2.74878C11.4939 3.34572 10.626 3.60952 8.78711 3.52059C8.44675 3.50414 7.99961 3.39408 7.60693 3.27256C7.49582 3.23818 7.38646 3.19733 7.27712 3.15649C7.15008 3.10903 7.02308 3.06159 6.89344 3.02433C6.45975 2.89969 6.03009 2.91392 5.62971 3.0263C5.50956 2.98901 5.3892 2.94865 5.26851 2.90817C5.01835 2.82428 4.76678 2.73992 4.51267 2.68142C3.94356 2.55041 3.41069 2.75363 2.99533 3.05825C2.57846 3.36398 2.22138 3.8097 1.94957 4.30573C1.66428 4.82635 1.5106 5.40259 1.49231 5.91896ZM10.6051 8.68425C10.9866 7.98795 11.4394 7.38085 11.9278 6.8783C12.6769 7.53018 13.1717 8.17432 13.4238 8.75106C13.6893 9.35867 13.6744 9.85621 13.4617 10.2444C13.2546 10.6223 12.8385 10.9029 12.1709 11.0084C11.5426 11.1076 10.7313 11.0418 9.794 10.7741C9.95466 10.091 10.2229 9.3816 10.6051 8.68425ZM13.4264 5.71995C13.1758 5.85571 12.9254 6.0188 12.6791 6.20754C13.4537 6.89902 14.0241 7.62766 14.3401 8.35057C14.6935 9.15932 14.7389 9.99457 14.3386 10.7249C13.9392 11.4539 13.1982 11.8584 12.327 11.9961C11.5454 12.1196 10.6234 12.0373 9.63348 11.7675C9.60713 12.0758 9.60447 12.3739 9.62485 12.6574C9.70968 13.8381 10.1817 14.6978 10.9166 15.1005C11.6516 15.5033 12.6302 15.4385 13.671 14.8746C14.7064 14.3136 15.7384 13.2861 16.4923 11.9103C16.776 11.3925 16.9977 10.8667 17.159 10.3487C17.2411 10.0851 17.5214 9.93788 17.785 10.02C18.0487 10.1021 18.1959 10.3824 18.1138 10.646C17.9324 11.2285 17.6845 11.8156 17.3693 12.3909C16.5368 13.91 15.3756 15.0884 14.1473 15.7539C12.9245 16.4164 11.569 16.5983 10.4361 15.9775C9.30313 15.3567 8.72709 14.1163 8.62742 12.7291C8.52731 11.3358 8.89565 9.72284 9.72809 8.2037C10.5605 6.68456 11.7218 5.50611 12.95 4.84069C14.1729 4.17819 15.5283 3.99622 16.6613 4.61705C17.5803 5.12063 18.1356 6.03691 18.3631 7.10207C18.4208 7.37213 18.2486 7.6378 17.9785 7.69548C17.7085 7.75315 17.4428 7.58098 17.3851 7.31093C17.201 6.44889 16.7798 5.82228 16.1807 5.49401C15.4458 5.09129 14.4672 5.15607 13.4264 5.71995ZM20.2049 14.5155C19.8187 14.3656 19.3842 14.5572 19.2343 14.9434C19.0845 15.3295 19.2761 15.764 19.6622 15.9139L21.4114 16.5926C21.7976 16.7425 22.2321 16.5509 22.382 16.1648C22.5318 15.7786 22.3402 15.3441 21.9541 15.1942L20.2049 14.5155ZM17.9326 16.6232C18.2114 16.3169 18.6857 16.2945 18.9921 16.5733L22.8336 20.0686C23.1399 20.3474 23.1623 20.8218 22.8836 21.1281C22.6048 21.4345 22.1304 21.4569 21.8241 21.1781L17.9826 17.6827C17.6762 17.404 17.6539 16.9296 17.9326 16.6232ZM16.8269 17.9194C16.6484 17.5456 16.2007 17.3874 15.8269 17.5659C15.4531 17.7444 15.2949 18.1921 15.4734 18.5659L16.8786 21.5078C17.0572 21.8816 17.5049 22.0398 17.8787 21.8613C18.2524 21.6828 18.4107 21.235 18.2322 20.8613L16.8269 17.9194Z"
        fill="currentColor"
      />
    </svg>
  );
};
