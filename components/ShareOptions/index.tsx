import { useReplicache } from "src/replicache";
import { ShareSmall } from "components/Icons";
import React, { useEffect, useState } from "react";
import { getShareLink } from "./getShareLink";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useSmoker } from "components/Toast";
import { Menu, MenuItem } from "components/Layout";
import { HoverButton } from "components/Buttons";
import useSWR from "swr";
import { useTemplateState } from "app/home/CreateNewButton";
import LoginForm from "app/login/LoginForm";
import { AddDomain, DomainOptions } from "./DomainOptions";
import { useIdentityData } from "components/IdentityProvider";

export type ShareMenuStates =
  | "default"
  | "login"
  | "chooseDomain"
  | "addDomain";

export let usePublishLink = () => {
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
  let { permission_token } = useReplicache();
  let [menuState, setMenuState] = useState<ShareMenuStates>("default");
  let domainConnected = false;

  return (
    <Menu
      className="max-w-xs"
      onOpenChange={() => {
        setMenuState("default");
      }}
      trigger={
        <HoverButton
          icon=<ShareSmall />
          label="Share"
          background="bg-accent-1"
          text="text-accent-2"
        />
      }
    >
      {menuState === "login" ? (
        <div className="px-3 py-1">
          <LoginForm />
        </div>
      ) : menuState === "chooseDomain" ? (
        <DomainOptions
          setMenuState={setMenuState}
          domainConnected={domainConnected}
        />
      ) : menuState === "addDomain" ? (
        <AddDomain setMenuState={setMenuState} />
      ) : (
        <DefaultOptions
          setMenuState={setMenuState}
          domainConnected={domainConnected}
        />
      )}
    </Menu>
  );
}

const DefaultOptions = (props: {
  setMenuState: (state: ShareMenuStates) => void;
  domainConnected: boolean;
}) => {
  let { permission_token } = useReplicache();
  let publishLink = usePublishLink();
  let [collabLink, setCollabLink] = useState<null | string>(null);
  useEffect(() => {
    // strip leading '/' character from pathname
    setCollabLink(window.location.pathname.slice(1));
  }, []);

  let isTemplate = useTemplateState(
    (s) => !!s.templates.find((t) => t.id === permission_token.id),
  );
  return (
    <>
      {isTemplate && (
        <>
          <ShareButton
            text="Offer Template"
            subtext="Let people create new leaflets using this as a template"
            smokerText="Template link copied!"
            id="get-template-link"
            link={`template/${publishLink}` || ""}
          />
          <hr className="border-border my-1" />
        </>
      )}
      <ShareButton
        text="Collaborate"
        subtext="Invite people to edit together"
        smokerText="Collab link copied!"
        id="get-collab-link"
        link={collabLink}
      />
      <ShareButton
        text="Publish"
        subtext=<>
          {props.domainConnected ? (
            <>
              This leaflet is published on{" "}
              <span className="italic underline">cozylittle.house/recipes</span>
            </>
          ) : (
            "Send the read-only version"
          )}
        </>
        smokerText="Publish link copied!"
        id="get-publish-link"
        link={publishLink || ""}
      />
      <hr className="border-border mt-1" />
      <DomainMenuItem
        setMenuState={props.setMenuState}
        domainConnected={props.domainConnected}
      />
    </>
  );
};

export const ShareButton = (props: {
  text: string;
  subtext: React.ReactNode;
  helptext?: string;
  smokerText: string;
  id: string;
  link: null | string;
}) => {
  let smoker = useSmoker();

  return (
    <MenuItem
      id={props.id}
      onSelect={(e) => {
        e.preventDefault();
        let rect = document.getElementById(props.id)?.getBoundingClientRect();
        if (props.link) {
          navigator.clipboard.writeText(
            `${location.protocol}//${location.host}/${props.link}`,
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
      <div className={`group/${props.id}`}>
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
  domainConnected: boolean;
}) => {
  let { identity } = useIdentityData();

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
        {props.domainConnected ? (
          <button
            className="px-3 py-1 text-accent-contrast text-sm hover:font-bold w-fit text-left"
            onMouseDown={() => {
              props.setMenuState("chooseDomain");
            }}
          >
            edit custom domain
          </button>
        ) : (
          <MenuItem
            className="font-normal text-tertiary text-sm"
            onSelect={(e) => {
              e.preventDefault();
              props.setMenuState("chooseDomain");
            }}
          >
            Publish on a custom domain
          </MenuItem>
        )}
      </>
    );
};
