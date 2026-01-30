import { HomeSmall } from "components/Icons/HomeSmall";
import { ActionButton } from "./ActionButton";
import { useIdentityData } from "components/IdentityProvider";
import Link from "next/link";
import { DiscoverSmall } from "components/Icons/DiscoverSmall";
import { PubIcon, PublicationButtons } from "./Publications";
import { ReaderUnreadSmall } from "components/Icons/ReaderSmall";
import {
  NotificationsReadSmall,
  NotificationsUnreadSmall,
} from "components/Icons/NotificationSmall";
import { SpeedyLink } from "components/SpeedyLink";
import { Popover } from "components/Popover";
import { WriterSmall } from "components/Icons/WriterSmall";
import { LooseLeafSmall } from "components/Icons/LooseleafSmall";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { theme } from "tailwind.config";

export type navPages =
  | "home"
  | "reader"
  | "pub"
  | "notifications"
  | "looseleafs"
  | "tag"
  | "profile";

export const HomeButton = (props: { current?: boolean }) => {
  return (
    <SpeedyLink href={"/home"} className="hover:!no-underline">
      <ActionButton
        nav
        icon={<HomeSmall />}
        label="Writer Home"
        className={props.current ? "bg-bg-page! border-border-light!" : ""}
      />
    </SpeedyLink>
  );
};

export const WriterButton = (props: {
  currentPage: navPages;
  currentPubUri?: string;
  compactOnMobile?: boolean;
}) => {
  let { identity } = useIdentityData();

  let currentPub = identity?.publications?.find(
    (pub) => pub.uri === props.currentPubUri,
  );
  let pubRecord = currentPub
    ? normalizePublicationRecord(currentPub.record)
    : null;

  let current =
    props.currentPage === "home" ||
    props.currentPage === "looseleafs" ||
    props.currentPage === "pub";
  console.log(current);

  let currentPubIcon =
    currentPub && pubRecord ? (
      <PubIcon record={pubRecord} uri={currentPub.uri} />
    ) : null;

  let currentIcon =
    props.currentPage === "home" ? (
      <HomeSmall className="text-tertiary" />
    ) : props.currentPage === "looseleafs" ? (
      <LooseLeafSmall className="text-tertiary" />
    ) : props.currentPage === "pub" ? (
      currentPubIcon
    ) : null;

  return (
    <Popover
      className="p-2!"
      asChild
      trigger={
        props.compactOnMobile ? (
          <ActionButton
            nav
            labelOnMobile={true}
            icon={<WriterSmall />}
            label=<div className="flex flex-row gap-1">
              Writer
              {current && (
                <>
                  <Divider /> {currentIcon}
                </>
              )}
            </div>
            className={current ? "bg-bg-page! border-border-light!" : ""}
          />
        ) : (
          <ActionButton
            nav
            labelOnMobile={false}
            icon={
              <>
                <WriterSmall />
                {current && (
                  <>
                    <Divider /> {currentIcon}
                  </>
                )}
              </>
            }
            label=<div className="flex flex-row gap-1">Writer</div>
            className={current ? "bg-bg-page! border-border-light!" : ""}
          />
        )
      }
    >
      <SpeedyLink href={"/home"} className="hover:!no-underline">
        <ActionButton
          nav
          icon={<HomeSmall />}
          label="Writer Home"
          className={
            props.currentPage === "home"
              ? "bg-bg-page! border-border-light!"
              : ""
          }
        />
      </SpeedyLink>
      <hr className="border-border-light border-dashed my-2" />
      <PublicationButtons
        currentPage={props.currentPage}
        currentPubUri={props.currentPubUri}
      />
    </Popover>
  );
};

export const ReaderButton = (props: {
  current?: boolean;
  subs: boolean;
  compactOnMobile?: boolean;
}) => {
  if (!props.subs) return;
  return (
    <SpeedyLink href={"/reader"} className="hover:no-underline!">
      <ActionButton
        nav
        labelOnMobile={props.compactOnMobile}
        icon={<ReaderUnreadSmall />}
        label="Reader"
        className={props.current ? "bg-bg-page! border-border-light!" : ""}
      />
    </SpeedyLink>
  );
};

export function NotificationButton(props: { current?: boolean }) {
  let { identity } = useIdentityData();
  let unreads = identity?.notifications[0]?.count;

  return (
    <SpeedyLink href={"/notifications"} className="hover:no-underline!">
      <ActionButton
        nav
        labelOnMobile={false}
        icon={
          unreads ? (
            <NotificationsUnreadSmall className="text-accent-contrast" />
          ) : (
            <NotificationsReadSmall />
          )
        }
        label="Notifications"
        className={`${props.current ? "bg-bg-page! border-border-light!" : ""} ${unreads ? "text-accent-contrast!" : ""}`}
      />
    </SpeedyLink>
  );
}

const Divider = () => {
  return (
    <svg
      width="6"
      height="25"
      viewBox="0 0 6 25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0.5 0.5V7.5L5 12.5L0.5 17.5L0.5 24.5"
        stroke={theme.colors["border-light"]}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
