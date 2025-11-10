import { useReplicache } from "src/replicache";
import React, { useEffect, useState } from "react";
import { getShareLink } from "./getShareLink";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useSmoker } from "components/Toast";
import { Menu, MenuItem } from "components/Layout";
import { ActionButton } from "components/ActionBar/ActionButton";
import useSWR from "swr";
import { useTemplateState } from "app/(home-pages)/home/Actions/CreateNewButton";
import LoginForm from "app/login/LoginForm";
import { CustomDomainMenu } from "./DomainOptions";
import { useIdentityData } from "components/IdentityProvider";
import {
  useLeafletDomains,
  useLeafletPublicationData,
} from "components/PageSWRDataProvider";
import { ShareSmall } from "components/Icons/ShareSmall";
import { PubLeafletDocument } from "lexicons/api";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";
import { AtUri } from "@atproto/syntax";
import { useIsMobile } from "src/hooks/isMobile";

export type ShareMenuStates = "default" | "login" | "domain";

export let useReadOnlyShareLink = () => {
  let { permission_token, rootEntity } = useReplicache();
  let entity_set = useEntitySetContext();
  let { data: publishLink } = useSWR(
    "publishLink-" + permission_token.id,
    async () => {
      if (
        !permission_token.permission_token_rights.find(
          (s) => s.entity_set === entity_set.set && s.create_token,
        )
      )
        return;
      let shareLink = await getShareLink(
        { id: permission_token.id, entity_set: entity_set.set },
        rootEntity,
      );
      return shareLink?.id;
    },
  );
  return publishLink;
};

export function ShareOptions() {
  let [menuState, setMenuState] = useState<ShareMenuStates>("default");
  let { data: pub } = useLeafletPublicationData();
  let isMobile = useIsMobile();

  return (
    <Menu
      asChild
      side={isMobile ? "top" : "right"}
      align={isMobile ? "center" : "start"}
      className="max-w-xs"
      onOpenChange={() => {
        setMenuState("default");
      }}
      trigger={
        <ActionButton
          icon=<ShareSmall />
          primary={!!!pub}
          secondary={!!pub}
          label={`Share ${pub ? "Draft" : ""}`}
        />
      }
    >
      {menuState === "login" ? (
        <div className="px-3 py-1">
          <LoginForm text="Save your Leaflets and access them on multiple devices!" />
        </div>
      ) : menuState === "domain" ? (
        <CustomDomainMenu setShareMenuState={setMenuState} />
      ) : (
        <ShareMenu
          setMenuState={setMenuState}
          domainConnected={false}
          isPub={!!pub}
        />
      )}
    </Menu>
  );
}

const ShareMenu = (props: {
  setMenuState: (state: ShareMenuStates) => void;
  domainConnected: boolean;
  isPub?: boolean;
}) => {
  let { permission_token } = useReplicache();
  let { data: pub } = useLeafletPublicationData();

  let record = pub?.documents?.data as PubLeafletDocument.Record | null;

  let postLink =
    pub?.publications && pub.documents
      ? `${getPublicationURL(pub.publications)}/${new AtUri(pub?.documents.uri).rkey}`
      : null;
  let publishLink = useReadOnlyShareLink();
  let [collabLink, setCollabLink] = useState<null | string>(null);
  useEffect(() => {
    // strip leading '/' character from pathname
    setCollabLink(window.location.pathname.slice(1));
  }, []);
  let { data: domains } = useLeafletDomains();

  let isTemplate = useTemplateState(
    (s) => !!s.templates.find((t) => t.id === permission_token.id),
  );

  return (
    <>
      {isTemplate && (
        <>
          <ShareButton
            text="Share Template"
            subtext="Let others make new Leaflets as copies of this template"
            smokerText="Template link copied!"
            id="get-template-link"
            link={`template/${publishLink}` || ""}
          />
          <hr className="border-border my-1" />
        </>
      )}

      <ShareButton
        text={`Share ${postLink ? "Draft" : ""} Edit Link`}
        subtext=""
        smokerText="Edit link copied!"
        id="get-edit-link"
        link={collabLink}
      />
      <ShareButton
        text={`Share ${postLink ? "Draft" : ""} View Link`}
        subtext=<>
          {domains?.[0] ? (
            <>
              This Leaflet is published on{" "}
              <span className="italic underline">
                {domains[0].domain}
                {domains[0].route}
              </span>
            </>
          ) : (
            ""
          )}
        </>
        smokerText="View link copied!"
        id="get-view-link"
        fullLink={
          domains?.[0]
            ? `https://${domains[0].domain}${domains[0].route}`
            : undefined
        }
        link={publishLink || ""}
      />
      {postLink && (
        <>
          <hr className="border-border-light" />

          <ShareButton
            text="Share Published Link"
            subtext=""
            smokerText="Post link copied!"
            id="get-post-link"
            fullLink={postLink.includes("http") ? postLink : undefined}
            link={postLink}
          />
        </>
      )}
      {!props.isPub && (
        <>
          <hr className="border-border mt-1" />
          <DomainMenuItem setMenuState={props.setMenuState} />
        </>
      )}
    </>
  );
};

export const ShareButton = (props: {
  text: React.ReactNode;
  subtext: React.ReactNode;
  helptext?: string;
  smokerText: string;
  id: string;
  link: null | string;
  fullLink?: string;
  className?: string;
}) => {
  let smoker = useSmoker();

  return (
    <MenuItem
      id={props.id}
      onSelect={(e) => {
        e.preventDefault();
        let rect = document.getElementById(props.id)?.getBoundingClientRect();
        if (props.link || props.fullLink) {
          navigator.clipboard.writeText(
            props.fullLink
              ? props.fullLink
              : `${location.protocol}//${location.host}/${props.link}`,
          );
          smoker({
            position: {
              x: rect ? rect.left + (rect.right - rect.left) / 2 : 0,
              y: rect ? rect.top + 26 : 0,
            },
            text: props.smokerText,
          });
        }
      }}
    >
      <div className={`group/${props.id} ${props.className}`}>
        <div className={`group-hover/${props.id}:text-accent-contrast`}>
          {props.text}
        </div>
        <div
          className={`text-sm font-normal text-tertiary group-hover/${props.id}:text-accent-contrast`}
        >
          {props.subtext}
        </div>
        {/* optional help text */}
        {props.helptext && (
          <div
            className={`text-sm italic font-normal text-tertiary group-hover/${props.id}:text-accent-contrast`}
          >
            {props.helptext}
          </div>
        )}
      </div>
    </MenuItem>
  );
};

const DomainMenuItem = (props: {
  setMenuState: (state: ShareMenuStates) => void;
}) => {
  let { identity } = useIdentityData();
  let { data: domains } = useLeafletDomains();

  if (identity === null)
    return (
      <div className="text-tertiary font-normal text-sm px-3 py-1">
        <button
          className="text-accent-contrast hover:font-bold"
          onClick={() => {
            props.setMenuState("login");
          }}
        >
          Log In
        </button>{" "}
        to publish on a custom domain!
      </div>
    );
  else
    return (
      <>
        {domains?.[0] ? (
          <button
            className="px-3 py-1 text-accent-contrast text-sm hover:font-bold w-fit text-left"
            onMouseDown={() => {
              props.setMenuState("domain");
            }}
          >
            Edit custom domain
          </button>
        ) : (
          <MenuItem
            className="font-normal text-tertiary text-sm"
            onSelect={(e) => {
              e.preventDefault();
              props.setMenuState("domain");
            }}
          >
            Publish on a custom domain
          </MenuItem>
        )}
      </>
    );
};
