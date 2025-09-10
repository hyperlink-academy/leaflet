import { HomeSmall } from "components/Icons/HomeSmall";
import {
  NotificationsUnreadSmall,
  NotificationsReadSmall,
} from "components/Icons/NotificationSmall";
import { PublishSmall } from "components/Icons/PublishSmall";
import {
  ReaderUnreadSmall,
  ReaderReadSmall,
} from "components/Icons/ReaderSmall";
import { ActionButton } from "./ActionButton";
import { Sidebar } from "./Sidebar";
import { Popover } from "components/Popover";
import { useIdentityData } from "components/IdentityProvider";
import { Json } from "supabase/database.types";
import { AtUri } from "@atproto/syntax";
import { PubLeafletPublication } from "lexicons/api";
import Link from "next/link";
import { getBasePublicationURL } from "app/lish/createPub/getPublicationURL";
import { DiscoverSmall } from "components/Icons/DiscoverSmall";

export const Navigation = () => {
  let unreadNotifications = true;
  let unreadReader = true;
  let subs = false;

  return (
    <div>
      <Sidebar alwaysOpen>
        <Link href={"/home"} className="hover:!no-underline">
          <ActionButton nav icon={<HomeSmall />} label="Home" />
        </Link>
        <PublicationsButton />

        {subs ? (
          <ActionButton
            nav
            icon={unreadReader ? <ReaderUnreadSmall /> : <ReaderReadSmall />}
            label="Reader"
            className={
              unreadReader && "!text-accent-contrast border-accent-contrast"
            }
          />
        ) : (
          <Link href={"/discover"} className="hover:!no-underline">
            <ActionButton nav icon={<DiscoverSmall />} label="Discover" />
          </Link>
        )}

        <hr className="border-border-light" />
        <ActionButton
          icon={
            unreadNotifications ? (
              <NotificationsUnreadSmall />
            ) : (
              <NotificationsReadSmall />
            )
          }
          label="Notifications"
        />
      </Sidebar>
    </div>
  );
};

const PublicationsButton = () => {
  let { identity } = useIdentityData();

  // don't show pub list button if not logged in or no pub list
  // we show a "start a pub" banner instead
  if (!identity || !identity.atp_did) return;

  if (identity.publications.length === 1)
    return (
      <Publication
        name={identity.publications[4].name}
        uri={identity.publications[4].uri}
        record={identity.publications[4].record}
        asActionButton
      />
    );
  return (
    <Popover
      asChild
      side="right"
      align="start"
      trigger={
        <ActionButton nav icon={<PublishSmall />} label="Publications" />
      }
    >
      <div className="pubListWrapper w-full  flex flex-col gap-[6px]  container pt-2 sm:p-0 sm:bg-transparent sm:border-0">
        {identity.publications?.map((d) => (
          <Publication {...d} key={d.uri} record={d.record} />
        ))}
        <hr className="border-border-light myt-2" />
        <Link
          href={"./lish/createPub"}
          className="pubListCreateNew  text-accent-contrast text-sm place-self-end hover:text-accent-contrast"
        >
          New
        </Link>
      </div>
    </Popover>
  );
};

const Publication = (props: {
  uri: string;
  name: string;
  record: Json;
  asActionButton?: boolean;
}) => {
  let record = props.record as PubLeafletPublication.Record | null;
  if (!record) return;

  let RecordIcon = () => {
    return record.icon ? (
      <div
        style={{
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundSize: "cover",
          backgroundImage: `url(/api/atproto_images?did=${new AtUri(props.uri).host}&cid=${(record.icon?.ref as unknown as { $link: string })["$link"]})`,
        }}
        className="w-6 h-6 rounded-full"
      />
    ) : (
      <div className="w-5 h-5 rounded-full bg-accent-1 relative">
        <div className="font-bold text-sm absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-accent-2">
          {record?.name.slice(0, 1)}
        </div>
      </div>
    );
  };

  if (props.asActionButton)
    return <ActionButton label={record.name} icon={<RecordIcon />} />;
  return (
    <Link
      href={`${getBasePublicationURL(props)}/dashboard`}
      className="flex gap-2 items-start text-secondary font-bold hover:!no-underline hover:text-accent-contrast"
    >
      <RecordIcon />

      {record.name}
    </Link>
  );
};
