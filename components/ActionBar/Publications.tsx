"use client";
import { ButtonSecondary } from "components/Buttons";
import Link from "next/link";

import { useIdentityData } from "components/IdentityProvider";
import { theme } from "tailwind.config";
import { BlueskyTiny } from "components/Icons/BlueskyTiny";
import { AddTiny } from "components/Icons/AddTiny";
import {
  getBasePublicationURL,
  getPublicationURL,
} from "app/lish/createPub/getPublicationURL";
import { Json } from "supabase/database.types";
import { PubLeafletPublication } from "lexicons/api";
import { AtUri } from "@atproto/syntax";
import { blobRefToSrc } from "src/utils/blobRefToSrc";
import { PublicationThemeProvider } from "components/ThemeManager/PublicationThemeProvider";
import { ActionButton } from "./ActionButton";
import { BlobRef } from "@atproto/lexicon";
import { SpeedyLink } from "components/SpeedyLink";
import { PublishSmall } from "components/Icons/PublishSmall";

export const PublicationButtons = (props: {
  currentPubUri: string | undefined;
}) => {
  let { identity } = useIdentityData();

  // don't show pub list button if not logged in or no pub list
  // we show a "start a pub" banner instead
  if (!identity || !identity.atp_did) return <PubListEmpty />;
  return (
    <div className="pubListWrapper w-full  flex flex-col gap-1 sm:bg-transparent sm:border-0">
      {identity.publications?.map((d) => {
        // console.log("thisURI : " + d.uri);
        // console.log("currentURI : " + props.currentPubUri);
        console.log(d.uri === props.currentPubUri);

        return (
          <PublicationOption
            {...d}
            key={d.uri}
            record={d.record}
            asActionButton
            current={d.uri === props.currentPubUri}
          />
        );
      })}
      <Link
        href={"./lish/createPub"}
        className="pubListCreateNew  text-accent-contrast text-sm place-self-end hover:text-accent-contrast"
      >
        New
      </Link>
    </div>
  );
};

export const PublicationOption = (props: {
  uri: string;
  name: string;
  record: Json;
  asActionButton?: boolean;
  current?: boolean;
}) => {
  let record = props.record as PubLeafletPublication.Record | null;
  if (!record) return;

  return (
    <SpeedyLink
      href={`${getBasePublicationURL(props)}/dashboard`}
      className="flex gap-2 items-start text-secondary font-bold hover:no-underline! hover:text-accent-contrast w-full"
    >
      {props.asActionButton ? (
        <ActionButton
          label={record.name}
          icon={<PubIcon record={record} uri={props.uri} />}
          nav
          className={props.current ? "bg-bg-page! border-border!" : ""}
        />
      ) : (
        <>
          <PubIcon record={record} uri={props.uri} />
          <div className="truncate">{record.name}</div>
        </>
      )}
    </SpeedyLink>
  );
};

const PubListEmpty = () => {
  return (
    <SpeedyLink href={`lish/createPub`} className=" hover:no-underline!">
      <ActionButton
        label="Publish on ATP"
        icon={<PublishSmall />}
        nav
        subtext="Start a blog or newletter on the Atmosphere"
      />
    </SpeedyLink>
  );
};

export const PubIcon = (props: {
  record: PubLeafletPublication.Record;
  uri: string;
}) => {
  if (!props.record) return;

  return props.record.icon ? (
    <div
      style={{
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundImage: `url(/api/atproto_images?did=${new AtUri(props.uri).host}&cid=${(props.record.icon?.ref as unknown as { $link: string })["$link"]})`,
      }}
      className="w-6 h-6 rounded-full"
    />
  ) : (
    <div className="w-5 h-5 rounded-full bg-accent-1 relative">
      <div className="font-bold text-sm absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-accent-2">
        {props.record?.name.slice(0, 1)}
      </div>
    </div>
  );
};

export const PubListEmptyIllo = () => {
  return (
    <svg
      width="59"
      height="44"
      viewBox="0 0 59 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_1288_1607)">
        <path
          d="M38.6621 26.0839C42.9399 28.2494 44.7287 33.455 42.6545 37.8247C40.5473 42.2636 35.1643 42.2021 31.0309 38.7504C26.8976 35.2986 17.5208 36.7293 13.0951 34.6285C8.66952 32.5277 1.04647 23.5131 3.1536 19.0741C5.26079 14.6351 11.6868 11.9665 16.1124 14.0673C20.5381 16.1681 38.4564 25.9829 38.4564 25.9829L38.6621 26.0839Z"
          fill={theme.colors["bg-page"]}
        />
        <path
          d="M44.0793 31.0064C44.7178 30.7014 45.4832 30.9723 45.7882 31.6108L48.1886 36.6362C48.4936 37.2747 48.2236 38.0402 47.5851 38.3452C46.9466 38.6502 46.1811 38.3792 45.8761 37.7407L43.4757 32.7153C43.1708 32.0769 43.4409 31.3114 44.0793 31.0064ZM47.6769 29.396C48.1531 28.8729 48.9632 28.8351 49.4865 29.311L56.049 35.2827C56.5724 35.7589 56.6111 36.5689 56.1349 37.0923C55.6587 37.6156 54.8487 37.6534 54.3254 37.1772L47.7629 31.2065C47.2395 30.7303 47.2007 29.9194 47.6769 29.396ZM39.717 5.68116C42.0981 4.90017 44.5808 4.94473 46.7375 6.12647C49.3605 7.5638 50.8245 10.3133 51.1896 13.4243C51.5549 16.538 50.8421 20.109 49.0216 23.4312C47.2012 26.7534 44.5751 29.2764 41.7541 30.644C38.9355 32.0105 35.8302 32.2552 33.2072 30.8179C30.9031 29.5552 29.4864 27.1999 28.9464 24.6831C28.8301 24.2474 28.6926 23.8222 28.5343 23.3853C27.9734 24.0541 27.3971 24.5221 26.7863 24.7798C25.6169 25.2729 24.5945 24.8983 23.8361 24.3579C22.7923 23.614 21.7765 22.8095 20.9679 21.9312C20.1616 21.0553 19.5008 20.0411 19.2707 18.8745L19.2629 18.8345C19.1678 18.3542 19.054 17.7817 19.2599 16.8921C19.4384 16.1213 19.8478 15.1379 20.6183 13.6987C19.832 13.0689 19.5569 12.0994 19.592 11.1099C19.6232 10.2278 19.8849 9.24332 20.3722 8.35401C20.8366 7.50662 21.4472 6.74544 22.1593 6.22315C22.8689 5.70275 23.7789 5.35579 24.7511 5.57959C25.3946 5.72772 26.0287 5.9727 26.6593 6.16846C27.3433 5.97648 28.0776 5.95162 28.8185 6.16455C29.2306 6.28299 29.6269 6.46238 30.0373 6.58936C30.7081 6.79695 31.4724 6.98507 32.0539 7.01319C35.195 7.16504 36.6776 6.71358 39.6769 5.69385C39.6901 5.68936 39.7037 5.6851 39.717 5.68116ZM45.7111 7.99951C43.9938 7.05853 41.9923 7.16313 40.1877 7.77588C39.8344 7.90062 39.4783 8.04953 39.1222 8.22217C36.7445 9.37492 34.4283 11.5618 32.7961 14.5405C31.1639 17.5192 30.5672 20.6477 30.8752 23.272C30.9368 23.7972 31.0577 24.2812 31.1691 24.7886C31.6931 26.6779 32.7517 28.1338 34.2336 28.9458C36.091 29.9635 38.4422 29.877 40.8224 28.7231C43.2002 27.5704 45.5163 25.3836 47.1486 22.4048C48.7809 19.4259 49.3775 16.2968 49.0695 13.6724C48.7611 11.0452 47.5685 9.0173 45.7111 7.99951ZM49.9005 26.5269C50.1565 25.8672 50.8991 25.5395 51.5587 25.7954L54.547 26.9556C55.2066 27.2116 55.5333 27.9532 55.2775 28.6128C55.0216 29.2724 54.2799 29.6 53.6203 29.3442L50.632 28.1851C49.9724 27.9291 49.6448 27.1865 49.9005 26.5269ZM39.1652 9.26807C41.2542 8.13629 43.5696 7.82566 45.505 8.88623C47.0749 9.74653 48.0237 11.3117 48.4123 13.1314C48.5106 13.5926 48.2163 14.0465 47.755 14.145C47.2939 14.2433 46.8399 13.949 46.7414 13.4878C46.4268 12.0152 45.7071 10.9451 44.6837 10.3843C43.4283 9.69643 41.7566 9.8068 39.9787 10.77C39.5506 11.0019 39.123 11.2806 38.7023 11.603C40.0255 12.7843 41.0004 14.0292 41.5402 15.2642C42.1439 16.6456 42.2208 18.0723 41.5373 19.3198C40.8549 20.5651 39.5891 21.2565 38.1007 21.4917C36.7655 21.7027 35.1903 21.5621 33.4992 21.1011C33.4542 21.6278 33.4497 22.1372 33.4845 22.6216C33.6295 24.6386 34.4361 26.1074 35.6916 26.7954C36.9471 27.4832 38.6187 27.3719 40.3966 26.4087C42.1654 25.4504 43.9291 23.6955 45.217 21.3452C45.7016 20.4607 46.0801 19.562 46.3556 18.6772C46.496 18.227 46.9746 17.9755 47.425 18.1157C47.8752 18.256 48.1266 18.7347 47.9865 19.1851C47.6767 20.1801 47.2535 21.1839 46.715 22.1665C45.2929 24.7616 43.3083 26.7749 41.2101 27.9116C39.1212 29.0432 36.8056 29.354 34.8703 28.2935C32.9348 27.2329 31.9507 25.1135 31.7804 22.7437C31.6095 20.3635 32.2393 17.6083 33.6613 15.0132C35.0834 12.418 37.067 10.4048 39.1652 9.26807ZM22.297 15.0933C21.7014 16.2428 21.4438 16.9252 21.34 17.3735C21.2375 17.8161 21.2789 18.0251 21.3586 18.4282L21.3654 18.4614C21.4906 19.0963 21.8766 19.7651 22.5392 20.4849C23.1994 21.202 24.0755 21.9061 25.0754 22.6187C25.4732 22.9022 25.706 22.918 25.9572 22.812C26.2951 22.6693 26.8456 22.2264 27.5851 21.0552C27.0094 19.7746 26.4315 18.8074 26.0109 18.3853C25.5581 17.9307 24.9198 17.457 24.3625 17.0815C24.0174 16.8492 23.6334 16.6577 23.3009 16.4087C22.8302 16.056 22.5072 15.5915 22.297 15.0933ZM37.4191 12.7485C36.5848 13.607 35.8111 14.6442 35.1593 15.8335C34.5066 17.0247 34.0481 18.237 33.7736 19.4038C35.3748 19.8612 36.7608 19.9738 37.8341 19.8042C38.9745 19.624 39.6854 19.1451 40.0392 18.4995C40.4026 17.8364 40.4284 16.9858 39.9748 15.9478C39.5441 14.9626 38.6986 13.8621 37.4191 12.7485ZM34.2082 9.14893C33.8924 9.16621 33.5635 9.17537 33.2189 9.17627C33.1388 9.23151 33.0511 9.29794 32.9562 9.37647C32.6169 9.65722 32.2522 10.0395 31.8879 10.479C31.1588 11.3585 30.4955 12.3901 30.1144 13.0855C29.6886 13.8625 29.21 14.8403 28.8732 15.8257C28.5838 16.6724 28.4237 17.4545 28.4445 18.0923C28.6141 18.3652 28.7815 18.6595 28.9445 18.9683C29.2882 17.1514 29.9462 15.2969 30.923 13.5142C31.8396 11.8415 32.9612 10.371 34.2082 9.14893ZM28.2306 8.22315C27.9953 8.13158 27.6238 8.07071 27.3918 8.1919C26.8031 8.49937 25.6057 9.41 25.0587 10.4204C24.7889 10.919 24.5664 11.6366 24.3986 12.355C24.273 12.8924 24.0375 13.5361 24.1984 14.0757C24.2869 14.3723 24.4121 14.5578 24.5441 14.6704C24.8879 14.8728 25.225 15.0872 25.5558 15.3101C25.9699 15.589 26.4729 15.9497 26.9435 16.3472C27.0299 15.9811 27.1376 15.6205 27.256 15.2739C27.6363 14.1611 28.164 13.0878 28.6154 12.2642C29.0414 11.4867 29.7649 10.3634 30.5724 9.38916C30.6783 9.26141 30.7871 9.1351 30.8976 9.01123C30.3592 8.90738 29.8338 8.76163 29.4064 8.6294C28.8588 8.45993 28.422 8.2968 28.2306 8.22315ZM24.2443 7.65479C24.0745 7.62582 23.8022 7.66603 23.422 7.94483C23.0226 8.23774 22.6009 8.7314 22.2453 9.38037C21.9128 9.98712 21.7449 10.6469 21.7257 11.1851C21.7078 11.6907 21.8192 11.8972 21.842 11.939C21.8441 11.9429 21.8456 11.9461 21.8459 11.9468L22.6076 12.5562C22.6451 12.3681 22.687 12.1695 22.7345 11.9663C22.9122 11.206 23.1764 10.3097 23.5568 9.60694C23.909 8.95632 24.4229 8.35989 24.9357 7.86866L24.2443 7.65479Z"
          fill={theme.colors["accent-contrast"]}
        />
      </g>
      <defs>
        <clipPath id="clip0_1288_1607">
          <rect width="59" height="44" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};
