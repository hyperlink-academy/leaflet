"use client";
import { callRPC } from "app/api/rpc/client";
import { ButtonPrimary } from "components/Buttons";
import { Input } from "components/Input";
import React, { useState, useRef, useEffect } from "react";
import {
  updatePublication,
  updatePublicationBasePath,
} from "./updatePublication";
import { usePublicationData } from "../[did]/[publication]/dashboard/PublicationSWRProvider";
import { PubLeafletPublication } from "lexicons/api";
import useSWR, { mutate } from "swr";
import { AddTiny } from "components/Icons/AddTiny";
import { DotLoader } from "components/utils/DotLoader";
import { useSmoker, useToaster } from "components/Toast";
import { addPublicationDomain } from "actions/domains/addDomain";
import { LoadingTiny } from "components/Icons/LoadingTiny";
import { PinTiny } from "components/Icons/PinTiny";
import { Verification } from "@vercel/sdk/esm/models/getprojectdomainop";
import Link from "next/link";
import { Checkbox } from "components/Checkbox";

export const EditPubForm = () => {
  let { data: pubData } = usePublicationData();
  let record = pubData?.record as PubLeafletPublication.Record;
  let [formState, setFormState] = useState<"normal" | "loading">("normal");

  let [nameValue, setNameValue] = useState(record?.name || "");
  let [showInDiscover, setShowInDiscover] = useState(
    record?.preferences?.showInDiscover === undefined
      ? true
      : record.preferences.showInDiscover,
  );
  let [showComments, setShowComments] = useState(
    record?.preferences?.showComments === undefined
      ? true
      : record.preferences.showComments,
  );
  let [descriptionValue, setDescriptionValue] = useState(
    record?.description || "",
  );
  let [iconFile, setIconFile] = useState<File | null>(null);
  let [iconPreview, setIconPreview] = useState<string | null>(null);
  let fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!pubData || !pubData.record) return;
    setNameValue(record.name);
    setDescriptionValue(record.description || "");
    if (record.icon)
      setIconPreview(
        `/api/atproto_images?did=${pubData.identity_did}&cid=${(record.icon.ref as unknown as { $link: string })["$link"]}`,
      );
  }, [pubData]);
  let toast = useToaster();

  return (
    <form
      className="flex flex-col gap-3 w-[1000px] max-w-full py-1"
      onSubmit={async (e) => {
        if (!pubData) return;
        e.preventDefault();
        setFormState("loading");
        let data = await updatePublication({
          uri: pubData.uri,
          name: nameValue,
          description: descriptionValue,
          iconFile: iconFile,
          preferences: {
            showInDiscover: showInDiscover,
            showComments: showComments,
          },
        });
        toast({ type: "success", content: "Updated!" });
        setFormState("normal");
        mutate("publication-data");
      }}
    >
      <div className="flex items-center justify-between gap-2 ">
        <p className="pl-0.5 pb-0.5 text-tertiary italic text-sm font-bold">
          Logo <span className="font-normal">(optional)</span>
        </p>
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer  ${iconPreview ? "border border-border-light hover:outline-border" : "border border-dotted border-accent-contrast hover:outline-accent-contrast"} selected-outline`}
          onClick={() => fileInputRef.current?.click()}
        >
          {iconPreview ? (
            <img
              src={iconPreview}
              alt="Logo preview"
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <AddTiny className="text-accent-1" />
          )}
        </div>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setIconFile(file);
              const reader = new FileReader();
              reader.onload = (e) => {
                setIconPreview(e.target?.result as string);
              };
              reader.readAsDataURL(file);
            }
          }}
        />
      </div>

      <label>
        <p className="pl-0.5 pb-0.5 text-tertiary italic text-sm font-bold">
          Publication Name
        </p>
        <Input
          className="input-with-border w-full text-primary"
          type="text"
          id="pubName"
          value={nameValue}
          onChange={(e) => {
            setNameValue(e.currentTarget.value);
          }}
        />
      </label>
      <label>
        <p className="text-tertiary italic text-sm font-bold pl-0.5 pb-0.5">
          Description <span className="font-normal">(optional)</span>
        </p>
        <Input
          textarea
          className="input-with-border w-full text-primary"
          rows={3}
          id="pubDescription"
          value={descriptionValue}
          onChange={(e) => {
            setDescriptionValue(e.currentTarget.value);
          }}
        />
      </label>

      <CustomDomainForm />
      <hr className="border-border-light" />

      <Checkbox
        checked={showInDiscover}
        onChange={(e) => setShowInDiscover(e.target.checked)}
      >
        <div className=" pt-0.5 flex flex-col  text-sm italic text-tertiary ">
          <p className="font-bold">
            Show In{" "}
            <a href="/discover" target="_blank">
              Discover
            </a>
          </p>
          <p className="text-xs text-tertiary font-normal">
            This publication will appear on our public Discover page
          </p>
        </div>
      </Checkbox>

      <Checkbox
        checked={showComments}
        onChange={(e) => setShowComments(e.target.checked)}
      >
        <div className=" pt-0.5 flex flex-col  text-sm italic text-tertiary ">
          <p className="font-bold">Show comments on posts</p>
        </div>
      </Checkbox>
      <hr className="border-border-light" />

      <ButtonPrimary className="place-self-end" type="submit">
        {formState === "loading" ? <DotLoader /> : "Update!"}
      </ButtonPrimary>
    </form>
  );
};

export function CustomDomainForm() {
  let { data: pubData } = usePublicationData();
  if (!pubData) return null;
  let record = pubData?.record as PubLeafletPublication.Record;
  let [state, setState] = useState<
    | { type: "default" }
    | { type: "addDomain" }
    | { type: "domainSettings"; domain: string; verification?: Verification[] }
  >({ type: "default" });
  let domains = pubData?.publication_domains || [];

  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-tertiary italic text-sm font-bold">
        Publication Domain{domains.length > 1 && "s"}
      </p>

      <div className="opaque-container px-[6px] py-1">
        {state.type === "addDomain" ? (
          <AddDomain
            publication_uri={pubData.uri}
            goBack={() => setState({ type: "default" })}
            setDomain={(d) => setState({ type: "domainSettings", domain: d })}
          />
        ) : state.type === "domainSettings" ? (
          <DomainSettings
            verification={state.verification}
            domain={state.domain}
            goBack={() => setState({ type: "default" })}
          />
        ) : (
          <div className="flex flex-col gap-1 py-1">
            {domains.map((d) => (
              <React.Fragment key={d.domain}>
                <Domain
                  domain={d.domain}
                  publication_uri={pubData.uri}
                  base_path={record.base_path || ""}
                  setDomain={(v) => {
                    setState({
                      type: "domainSettings",
                      domain: d.domain,
                      verification: v,
                    });
                  }}
                />
                <hr className="border-border-light last:hidden" />
              </React.Fragment>
            ))}
            <button
              className="text-accent-contrast text-sm w-fit "
              onClick={() => setState({ type: "addDomain" })}
              type="button"
            >
              Add custom domain
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AddDomain(props: {
  publication_uri: string;
  goBack: () => void;
  setDomain: (d: string) => void;
}) {
  let [domain, setDomain] = useState("");
  let smoker = useSmoker();

  return (
    <div className="w-full flex flex-col gap-0.5 py-1">
      <label>
        <p className="pl-0.5 text-tertiary italic text-sm">
          Add a Custom Domain
        </p>
        <Input
          className="w-full input-with-border"
          placeholder="domain"
          value={domain}
          onChange={(e) => setDomain(e.currentTarget.value)}
        />
      </label>
      <div className="flex flex-row justify-between text-sm pt-2">
        <button className="text-accent-contrast" onClick={() => props.goBack()}>
          Back
        </button>
        <button
          className="place-self-end font-bold text-accent-contrast text-sm"
          onClick={async (e) => {
            let { error } = await addPublicationDomain(
              domain,
              props.publication_uri,
            );
            if (error) {
              smoker({
                error: true,
                text:
                  error === "invalid_domain"
                    ? "Invalid domain! Use just the base domain"
                    : error === "domain_already_in_use"
                      ? "That domain is already in use!"
                      : "An unknown error occured",
                position: {
                  y: e.clientY,
                  x: e.clientX - 5,
                },
              });
            }

            mutate("publication-data");
            props.setDomain(domain);
          }}
          type="button"
        >
          Add Domain
        </button>
      </div>
    </div>
  );
}

// OKay so... You hit this button, it gives you a form. You type in the form, and then hit add. We create a record, and a the record link it to your publiction. Then we show you the stuff to set. )
// We don't want to switch it, until it works.
// There's a checkbox to say that this is hosted somewhere else

function Domain(props: {
  domain: string;
  base_path: string;
  publication_uri: string;
  setDomain: (v?: Verification[]) => void;
}) {
  let { data } = useSWR(props.domain, async (domain) => {
    return await callRPC("get_domain_status", { domain });
  });

  let pending = data?.config?.misconfigured || data?.error;
  console.log(props.domain, data);

  return (
    <div className="text-sm text-secondary relative w-full ">
      <div className="pr-8 truncate">{props.domain}</div>
      <div className="absolute right-0 top-0 bottom-0 flex justify-end items-center w-4 ">
        {pending ? (
          <button
            className="group/pending px-1 py-0.5 flex gap-1 items-center rounded-full  hover:bg-accent-1  hover:text-accent-2 hover:outline-accent-1 border-transparent outline outline-transparent selected-outline"
            onClick={() => {
              if (data?.error === "Verification_needed") {
                props.setDomain(data.verification);
              } else {
                props.setDomain();
              }
            }}
          >
            <p className="group-hover/pending:block hidden w-max pl-1 font-bold">
              pending
            </p>
            <LoadingTiny className="animate-spin text-accent-contrast group-hover/pending:text-accent-2 " />
          </button>
        ) : props.base_path === props.domain ? (
          <div className="group/default-domain flex gap-1 items-center rounded-full bg-none w-max  px-1 py-0.5 hover:bg-bg-page border border-transparent hover:border-border-light ">
            <p className="group-hover/default-domain:block hidden w-max pl-1">
              current default domain
            </p>
            <PinTiny className="text-accent-contrast shrink-0" />
          </div>
        ) : (
          <button
            type="button"
            onClick={async () => {
              await updatePublicationBasePath({
                uri: props.publication_uri,
                base_path: props.domain,
              });
              mutate("publication-data");
            }}
            className="group/domain flex gap-1 items-center rounded-full bg-none w-max font-bold px-1 py-0.5 hover:bg-accent-1 hover:text-accent-2 border-transparent outline outline-transparent hover:outline-accent-1  selected-outline"
          >
            <p className="group-hover/domain:block hidden w-max pl-1">
              set as default
            </p>
            <PinTiny className="text-secondary group-hover/domain:text-accent-2 shrink-0" />
          </button>
        )}
      </div>
    </div>
  );
}

const DomainSettings = (props: {
  domain: string;
  goBack: () => void;
  verification?: Verification[];
}) => {
  let isSubdomain = props.domain.split(".").length > 2;
  if (props.verification)
    return (
      <div className="flex flex-col gap-[6px] text-sm">
        <div>{props.domain} is in use on a Vercel account.</div>
        <div className="flex gap-3 p-1 border border-border-light rounded-md py-1">
          <div className="flex flex-col ">
            <div className="text-tertiary">Type</div>
            <div>{props.verification[0].type}</div>
          </div>
          <div className="flex flex-col">
            <div className="text-tertiary">Name</div>
            <div style={{ wordBreak: "break-word" }}>
              {props.verification[0].domain}
            </div>
          </div>
          <div className="flex flex-col">
            <div className="text-tertiary">Value</div>
            <div style={{ wordBreak: "break-word" }}>
              {props.verification?.[0].value}
            </div>
          </div>
        </div>
        <div>
          <button
            className="text-accent-contrast w-fit"
            onClick={() => props.goBack()}
          >
            Back
          </button>
        </div>
        <button className="text-accent-contrast w-fit">verify</button>
      </div>
    );

  return (
    <div className="flex flex-col gap-[6px] text-sm">
      <div>
        To verify this domain, add the following record to your DNS provider for{" "}
        <strong>{props.domain}</strong>.
      </div>

      {isSubdomain ? (
        <div className="flex gap-3 p-1 border border-border-light rounded-md py-1">
          <div className="flex flex-col ">
            <div className="text-tertiary">Type</div>
            <div>CNAME</div>
          </div>
          <div className="flex flex-col">
            <div className="text-tertiary">Name</div>
            <div style={{ wordBreak: "break-word" }}>
              {props.domain.split(".").slice(0, -2).join(".")}
            </div>
          </div>
          <div className="flex flex-col">
            <div className="text-tertiary">Value</div>
            <div style={{ wordBreak: "break-word" }}>cname.vercel-dns.com</div>
          </div>
        </div>
      ) : (
        <div className="flex gap-3 px-2 py-1 border border-border-light rounded-md ">
          <div className="flex flex-col ">
            <div className="text-tertiary">Type</div>
            <div>A</div>
          </div>
          <div className="flex flex-col">
            <div className="text-tertiary">Name</div>
            <div>@</div>
          </div>
          <div className="flex flex-col">
            <div className="text-tertiary">Value</div>
            <div>76.76.21.21</div>
          </div>
        </div>
      )}
      <button
        className="text-accent-contrast w-fit"
        onClick={() => props.goBack()}
      >
        Back
      </button>
    </div>
  );
};
