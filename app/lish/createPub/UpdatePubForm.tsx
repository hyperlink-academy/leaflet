"use client";
import { callRPC } from "app/api/rpc/client";
import { createPublication } from "./createPublication";
import { ButtonPrimary } from "components/Buttons";
import { AddSmall } from "components/Icons/AddSmall";
import { Input, InputWithLabel } from "components/Input";
import { useState, useRef, useEffect } from "react";
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
import { addDomain, addPublicationDomain } from "actions/domains/addDomain";

export const EditPubForm = () => {
  let pubData = usePublicationData();
  let record = pubData?.record as PubLeafletPublication.Record;
  let [formState, setFormState] = useState<"normal" | "loading">("normal");

  let [nameValue, setNameValue] = useState(record?.name || "");
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
      className="flex flex-col gap-3 w-full py-1"
      onSubmit={async (e) => {
        if (!pubData) return;
        e.preventDefault();
        setFormState("loading");
        let data = await updatePublication({
          uri: pubData.uri,
          name: nameValue,
          description: descriptionValue,
          iconFile: iconFile,
        });
        toast({ type: "success", content: "Updated!" });
        setFormState("normal");
        mutate("publication-data");
      }}
    >
      <div className="flex items-center justify-between gap-2 ">
        <div className="text-center text-secondary flex flex-col ">
          <p className=" font-bold text-secondary">
            Logo{" "}
            <span className="italic text-tertiary font-normal">(optional)</span>
          </p>
        </div>
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
      <InputWithLabel
        type="text"
        id="pubName"
        label="Publication Name"
        value={nameValue}
        onChange={(e) => {
          setNameValue(e.currentTarget.value);
        }}
      />

      <InputWithLabel
        label="Description (optional)"
        textarea
        rows={3}
        id="pubDescription"
        value={descriptionValue}
        onChange={(e) => {
          setDescriptionValue(e.currentTarget.value);
        }}
      />

      <hr className="text-border" />

      <CustomDomainForm />

      <ButtonPrimary className="place-self-end" type="submit">
        {formState === "loading" ? <DotLoader /> : "Update Publication"}
      </ButtonPrimary>
    </form>
  );
};

export function CustomDomainForm() {
  let pubData = usePublicationData();
  let domains = pubData?.publication_domains || [];
  if (!pubData) return null;
  let record = pubData?.record as PubLeafletPublication.Record;
  return (
    <>
      {domains.map((d) => (
        <Domain
          domain={d.domain}
          key={d.domain}
          publication_uri={pubData.uri}
          base_path={record.base_path || ""}
        />
      ))}
      <AddDomain publication_uri={pubData.uri} />
    </>
  );
}

function AddDomain(props: { publication_uri: string }) {
  let [domain, setDomain] = useState("");
  let smoker = useSmoker();
  let [state, setState] = useState<"closed" | "open">("closed");
  if (state === "closed")
    return (
      <button onClick={() => setState("open")} type="button">
        add a custom domain
      </button>
    );
  if (state === "open") {
    return (
      <div>
        <Input
          placeholder="domain"
          value={domain}
          onChange={(e) => setDomain(e.currentTarget.value)}
        />
        <button
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
          }}
          type="button"
        >
          add!
        </button>
      </div>
    );
  }
}
// OKay so... You hit this button, it gives you a form. You type in the form, and then hit add. We create a record, and a the record link it to your publiction. Then we show you the stuff to set. )
// We don't want to switch it, until it works.
// There's a checkbox to say that this is hosted somewhere else

function Domain(props: {
  domain: string;
  base_path: string;
  publication_uri: string;
}) {
  let { data } = useSWR(props.domain, async (domain) => {
    return await callRPC("get_domain_status", { domain });
  });
  let pending = data?.config?.misconfigured || data?.error;
  let isSubdomain = props.domain.split(".").length > 2;
  console.log(data);
  if (!pending)
    return (
      <div>
        {props.domain} active!{" "}
        {props.base_path === props.domain ? (
          "main"
        ) : (
          <button
            type="button"
            onClick={() => {
              updatePublicationBasePath({
                uri: props.publication_uri,
                base_path: props.domain,
              });
            }}
          >
            make main
          </button>
        )}
      </div>
    );
  if (pending)
    return (
      <div className="flex flex-col gap-[6px]">
        <div>
          To verify this domain, add the following record to your DNS provider
          for <strong>{props.domain}</strong>.
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
              <div style={{ wordBreak: "break-word" }}>
                cname.vercel-dns.com
              </div>
            </div>
          </div>
        ) : (
          <div className="flex gap-3 p-1 border border-border-light rounded-md py-1">
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
      </div>
    );
}
