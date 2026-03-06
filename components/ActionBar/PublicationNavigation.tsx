"use client";
import { useIdentityData } from "components/IdentityProvider";
import { getBasePublicationURL } from "app/lish/createPub/getPublicationURL";
import {
  normalizePublicationRecord,
  type NormalizedPublication,
} from "src/utils/normalizeRecords";
import { SpeedyLink } from "components/SpeedyLink";
import { Popover } from "components/Popover";
import { ButtonPrimary } from "components/Buttons";
import { LooseLeafSmall } from "components/Icons/LooseleafSmall";
import { HomeButton, type navPages } from "./NavigationButtons";
import { HomeSmall } from "components/Icons/HomeSmall";
import { MoreOptionsVerticalTiny } from "components/Icons/MoreOptionsVerticalTiny";
import { PubIcon, PublicationButtons } from "./Publications";
import { HomeTiny } from "components/Icons/HomeTiny";
import { LooseleafTiny } from "components/Icons/LooseleafTiny";
import { Separator } from "components/Layout";
import { Menu, MenuItem } from "components/Menu";
import { AddTiny } from "components/Icons/AddTiny";

export const PublicationNavigation = (props: {
  currentPage: navPages;
  currentPubUri?: string;
}) => {
  let { identity } = useIdentityData();

  if (!identity) return;

  let hasLooseleafs = !!identity?.permission_token_on_homepage.find(
    (f) =>
      f.permission_tokens.leaflets_to_documents &&
      f.permission_tokens.leaflets_to_documents[0]?.document,
  );

  let pubCount = identity?.publications.length ?? 0;
  let onlyOnePub = pubCount === 1 && hasLooseleafs;
  let onlyLooseleafs = pubCount === 0 && hasLooseleafs;
  let className =
    "font-bold text-secondary flex gap-2 items-center grow min-w-0 text-sm h-[34px] px-2 accent-container";

  // if not publications or looseleafs
  if (!identity.publications && !hasLooseleafs) {
    return (
      <SpeedyLink href="/lish/createPub">
        <ButtonPrimary compact className="text-sm!">
          Create a Publication!
        </ButtonPrimary>
      </SpeedyLink>
    );
  }

  switch (props.currentPage) {
    case "looseleafs":
    case "pub":
      if (onlyLooseleafs || onlyOnePub)
        return (
          <>
            <SpeedyLink href={`/home`} className={className}>
              <HomeTiny className="shrink-0" />
              Home
            </SpeedyLink>
          </>
        );
      break;
    case "home": {
      if (onlyLooseleafs || onlyOnePub) {
        let pub = identity.publications[0];
        return (
          <div className={className}>
            <Menu trigger={<MoreOptionsVerticalTiny className="shrink-0" />}>
              <SpeedyLink href="/createPub">
                <MenuItem className="items-center! text-sm" onSelect={() => {}}>
                  <AddTiny />
                  Create New Publication
                </MenuItem>
              </SpeedyLink>
            </Menu>
            <Separator classname="h-6!" />
            {onlyLooseleafs ? (
              <SpeedyLink
                href="/looseleafs"
                className="hover:no-underline! text-inherit flex gap-2 items-center pr-2 w-full min-w-0"
              >
                <LooseleafTiny className="shrink-0" /> Looseleafs
              </SpeedyLink>
            ) : (
              <SpeedyLink
                href={`${getBasePublicationURL(pub)}/dashboard`}
                className="hover:no-underline! text-inherit flex gap-2 items-center pr-2 w0ull min-w-0"
              >
                <PubIcon
                  small
                  record={normalizePublicationRecord(pub.record)}
                  uri={pub.uri}
                />
                <div className="truncate min-w-0">{pub.name}</div>
              </SpeedyLink>
            )}
          </div>
        );
      }
      break;
    }
  }

  return (
    <Popover
      trigger={
        <div className={className}>
          <PubIcons
            publications={identity.publications.map((pub) => ({
              record: normalizePublicationRecord(pub.record),
              uri: pub.uri,
            }))}
          />{" "}
          Publications
        </div>
      }
      className="pt-1 px-2!"
    >
      <HomeButton current={props.currentPage === "home"} />
      <hr className="my-1 border-border-light" />
      <PublicationButtons
        currentPage={props.currentPage}
        currentPubUri={props.currentPubUri}
      />
    </Popover>
  );
};

function PubIcons(props: {
  publications: { record: NormalizedPublication | null; uri: string }[];
}) {
  if (props.publications.length < 1) return null;
  return (
    <div className="flex">
      {props.publications.map((pub, index) => {
        if (index <= 2)
          return (
            <div className="-ml-[6px] first:ml-0" key={pub.uri}>
              <PubIcon small record={pub.record} uri={pub.uri} />
            </div>
          );
      })}
    </div>
  );
}
