import { useEntity, useReplicache } from "src/replicache";
import { ShareSmall } from "components/Icons";
import React, { useEffect, useState } from "react";
import { getShareLink } from "./getShareLink";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useSmoker } from "components/Toast";
import { Menu, MenuItem } from "components/Layout";
import { ButtonPrimary, HoverButton } from "components/Buttons";
import useSWR from "swr";
import { useTemplateState } from "app/home/CreateNewButton";
import LoginForm from "app/login/LoginForm";
import { AddDomain, CustomDomainMenu, DomainOptions } from "./DomainOptions";
import { useIdentityData } from "components/IdentityProvider";
import { useLeafletDomains } from "components/PageSWRDataProvider";
import { Checkbox } from "components/Checkbox";
import { Toggle } from "components/Toggle";
import { InputWithLabel } from "components/Input";

export type ShareMenuStates = "default" | "login" | "domain" | "settings";

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
      ) : menuState === "domain" ? (
        <CustomDomainMenu setShareMenuState={setMenuState} />
      ) : menuState === "settings" ? (
        <SEOOptions />
      ) : (
        <DefaultOptions setMenuState={setMenuState} domainConnected={false} />
      )}
    </Menu>
  );
}

const SEOOptions = () => {
  let { rootEntity, rep } = useReplicache();
  let metadataTitle = useEntity(rootEntity, "root/page-metadata-title");
  let metadataDescription = useEntity(
    rootEntity,
    "root/page-metadata-description",
  );
  let toIndex = useEntity(rootEntity, "root/webindex");
  let [seo, setSeo] = useState(!!toIndex?.data.value);
  let [title, setTitle] = useState(metadataTitle?.data.value || "");
  let [description, setDescription] = useState(
    metadataDescription?.data.value || "",
  );

  useEffect(() => {
    setTitle(metadataTitle?.data.value || "");
  }, [metadataTitle]);
  useEffect(() => {
    setDescription(metadataDescription?.data.value || "");
  }, [metadataDescription]);

  return (
    <form
      className="flex flex-col gap-3 px-3 py-1 "
      onSubmit={async () => {
        // set seo on/off
        rep?.mutate.assertFact({
          entity: rootEntity,
          attribute: "root/webindex",
          data: { type: "boolean", value: seo },
        });

        // if seo is off, do nothing else
        if (toIndex?.data.value === false) return;

        //set title
        await rep?.mutate.assertFact({
          entity: rootEntity,
          attribute: "root/page-metadata-title",
          data: { type: "string", value: title },
        });

        //set description
        await rep?.mutate.assertFact({
          entity: rootEntity,
          attribute: "root/page-metadata-description",
          data: { type: "string", value: description },
        });
      }}
    >
      <div className="flex flex-col">
        <Toggle
          checked={seo}
          onChange={(e) => {
            e.preventDefault();
            setSeo(!toIndex?.data.value);
          }}
        >
          <h4>Search Engine Indexing</h4>
        </Toggle>
        <div className=" text-sm text-tertiary font-normal">
          {toIndex?.data.value === true
            ? "Search Engines can find this Leaflet!"
            : "Search engines will not find this Leaflet unless it is linked to from somewhere else (like social media)."}
        </div>
      </div>
      {seo === true ? (
        <>
          <div>
            <h4>Metadata</h4>
            <div className=" text-sm text-tertiary font-normal">
              How should this Leaflet appear in search results?
            </div>
          </div>

          <InputWithLabel
            label="Title"
            value={title}
            onChange={async (e) => {
              setTitle(e.currentTarget.value);
            }}
          />
          {/* <label className="flex flex-col ">
            <div className="font-bold text-secondary">Title</div>
            <input
              className="input-with-border w-[1000px] max-w-full"
              value={title}
              onChange={async (e) => {
                setTitle(e.currentTarget.value);
              }}
            />
          </label> */}
          <label className="flex flex-col ">
            <div className="font-bold text-secondary">Description</div>
            <textarea
              rows={3}
              className="input-with-border w-[1000px] max-w-full resize-none h-24"
              value={description}
              onChange={async (e) => {
                setDescription(e.currentTarget.value);
              }}
            />
          </label>
        </>
      ) : null}
      <ButtonPrimary type="submit" className="place-self-end">
        Save
      </ButtonPrimary>
    </form>
  );
};

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
  let { data: domains } = useLeafletDomains();

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
        text="Get Edit Link"
        subtext="Invite people to edit together"
        smokerText="Collab link copied!"
        id="get-collab-link"
        link={collabLink}
      />
      <ShareButton
        text="Get View Link"
        subtext={
          <div className="leading-tight">
            {domains?.[0] ? (
              <>
                This leaflet is published on{" "}
                <span className="italic underline">
                  {domains[0].domain}
                  {domains[0].route}
                </span>
              </>
            ) : (
              "Share the read-only version"
            )}
            <DomainSettings setMenuState={props.setMenuState} />
          </div>
        }
        smokerText="Publish link copied!"
        id="get-publish-link"
        fullLink={
          domains?.[0]
            ? `https://${domains[0].domain}${domains[0].route}`
            : undefined
        }
        link={publishLink || ""}
      />
      <hr className="border-border mt-1" />
      <MenuItem
        className="text-sm text-tertiary font-normal"
        onSelect={(e) => {
          e.preventDefault();
          props.setMenuState("settings");
          console.log("settings");
        }}
      >
        Settings
      </MenuItem>
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
  fullLink?: string;
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

const DomainSettings = (props: {
  setMenuState: (state: ShareMenuStates) => void;
}) => {
  let { identity } = useIdentityData();
  let { data: domains } = useLeafletDomains();

  if (identity === null)
    return (
      <div className="text-tertiary font-normal">
        <button
          className="text-accent-contrast hover:font-bold"
          onClick={(e) => {
            e.target === e.currentTarget && e.stopPropagation();
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
        {domains?.custom_domain_routes?.[0] ? (
          <button
            className="text-accent-contrast text-sm hover:font-bold w-fit text-left"
            onMouseDown={(e) => {
              e.target === e.currentTarget && e.stopPropagation();
              props.setMenuState("domain");
            }}
          >
            Edit domain
          </button>
        ) : (
          <button
            className="text-accent-contrast text-sm hover:font-bold w-fit text-left"
            onSelect={(e) => {
              e.target === e.currentTarget && e.stopPropagation();
              e.preventDefault();
              props.setMenuState("domain");
            }}
          >
            Publish on a custom domain
          </button>
        )}
      </>
    );
};
