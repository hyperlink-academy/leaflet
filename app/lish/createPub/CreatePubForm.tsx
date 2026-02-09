"use client";
import { callRPC } from "app/api/rpc/client";
import { createPublication } from "./createPublication";
import { ButtonPrimary } from "components/Buttons";
import { AddSmall } from "components/Icons/AddSmall";
import { useIdentityData } from "components/IdentityProvider";
import { Input, InputWithLabel } from "components/Input";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useDebouncedEffect } from "src/hooks/useDebouncedEffect";
import { theme } from "tailwind.config";
import { getBasePublicationURL, getPublicationURL } from "./getPublicationURL";
import { string } from "zod";
import { DotLoader } from "components/utils/DotLoader";
import { Checkbox } from "components/Checkbox";
import { OAuthErrorMessage, isOAuthSessionError } from "components/OAuthError";

type DomainState =
  | { status: "empty" }
  | { status: "valid" }
  | { status: "invalid" }
  | { status: "pending" }
  | { status: "error"; message: string };

export const CreatePubForm = () => {
  let [formState, setFormState] = useState<"normal" | "loading">("normal");
  let [nameValue, setNameValue] = useState("");
  let [descriptionValue, setDescriptionValue] = useState("");
  let [showInDiscover, setShowInDiscover] = useState(true);
  let [logoFile, setLogoFile] = useState<File | null>(null);
  let [logoPreview, setLogoPreview] = useState<string | null>(null);
  let [domainValue, setDomainValue] = useState("");
  let [domainState, setDomainState] = useState<DomainState>({
    status: "empty",
  });
  let [oauthError, setOauthError] = useState<
    import("src/atproto-oauth").OAuthSessionError | null
  >(null);
  let fileInputRef = useRef<HTMLInputElement>(null);

  let router = useRouter();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        if (formState !== "normal") return;
        e.preventDefault();
        if (!subdomainValidator.safeParse(domainValue).success) return;
        setFormState("loading");
        setOauthError(null);
        let result = await createPublication({
          name: nameValue,
          description: descriptionValue,
          iconFile: logoFile,
          subdomain: domainValue,
          preferences: {
            showInDiscover,
            showComments: true,
            showMentions: true,
            showPrevNext: true,
            showRecommends: true,
          },
        });

        if (!result.success) {
          setFormState("normal");
          if (result.error && isOAuthSessionError(result.error)) {
            setOauthError(result.error);
          }
          return;
        }

        // Show a spinner while this is happening! Maybe a progress bar?
        setTimeout(() => {
          setFormState("normal");
          if (result.publication)
            router.push(
              `${getBasePublicationURL(result.publication)}/dashboard`,
            );
        }, 500);
      }}
    >
      <div className="flex flex-col items-center mb-4 gap-2">
        <div className="text-center text-secondary flex flex-col ">
          <h3 className="-mb-1">Logo</h3>
          <p className="italic text-tertiary">(optional)</p>
        </div>
        <div
          className="w-24 h-24 rounded-full border-2 border-dotted border-accent-1 flex items-center justify-center cursor-pointer hover:border-accent-contrast"
          onClick={() => fileInputRef.current?.click()}
        >
          {logoPreview ? (
            <img
              src={logoPreview}
              alt="Logo preview"
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <AddSmall className="text-accent-1" />
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
              setLogoFile(file);
              const reader = new FileReader();
              reader.onload = (e) => {
                setLogoPreview(e.target?.result as string);
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
      <DomainInput
        domain={domainValue}
        setDomain={setDomainValue}
        domainState={domainState}
        setDomainState={setDomainState}
      />
      <hr className="border-border-light" />
      <Checkbox
        checked={showInDiscover}
        onChange={(e) => setShowInDiscover(e.target.checked)}
      >
        <div className=" pt-0.5 flex flex-col text-sm text-tertiary  ">
          <p className="font-bold italic">Show In Discover</p>
          <p className="text-sm text-tertiary font-normal">
            Your posts will appear on our{" "}
            <a href="/discover" target="_blank">
              Discover
            </a>{" "}
            page. You can change this at any time!
          </p>
        </div>
      </Checkbox>
      <hr className="border-border-light" />

      <div className="flex flex-col gap-2">
        <div className="flex w-full justify-end">
          <ButtonPrimary
            type="submit"
            disabled={
              !nameValue || !domainValue || domainState.status !== "valid"
            }
          >
            {formState === "loading" ? <DotLoader /> : "Create Publication!"}
          </ButtonPrimary>
        </div>
        {oauthError && (
          <OAuthErrorMessage
            error={oauthError}
            className="text-right text-sm text-accent-1"
          />
        )}
      </div>
    </form>
  );
};

let subdomainValidator = string()
  .min(3)
  .max(63)
  .regex(/^[a-z0-9-]+$/);
function DomainInput(props: {
  domain: string;
  setDomain: (d: string) => void;
  domainState: DomainState;
  setDomainState: (s: DomainState) => void;
}) {
  useEffect(() => {
    if (!props.domain) {
      props.setDomainState({ status: "empty" });
    } else {
      let valid = subdomainValidator.safeParse(props.domain);
      if (!valid.success) {
        let reason = valid.error.errors[0].code;
        props.setDomainState({
          status: "error",
          message:
            reason === "too_small"
              ? "Must be at least 3 characters long"
              : reason === "invalid_string"
                ? "Must contain only lowercase a-z, 0-9, and -"
                : "",
        });
        return;
      }
      props.setDomainState({ status: "pending" });
    }
  }, [props.domain]);

  useDebouncedEffect(
    async () => {
      if (!props.domain) return props.setDomainState({ status: "empty" });

      let valid = subdomainValidator.safeParse(props.domain);
      if (!valid.success) {
        return;
      }
      let status = await callRPC("get_leaflet_subdomain_status", {
        domain: props.domain,
      });
      if (status.error === "Not Found")
        props.setDomainState({ status: "valid" });
      else props.setDomainState({ status: "invalid" });
    },
    500,
    [props.domain],
  );

  return (
    <div className="flex flex-col gap-1">
      <label className=" input-with-border flex flex-col text-sm text-tertiary font-bold italic leading-tight py-1! px-[6px]!">
        <div>Choose your domain</div>
        <div className="flex flex-row  items-center">
          <Input
            minLength={3}
            maxLength={63}
            placeholder="domain"
            className="appearance-none w-full font-normal bg-transparent text-base text-primary focus:outline-0 outline-hidden"
            value={props.domain}
            onChange={(e) => props.setDomain(e.currentTarget.value)}
          />
          .leaflet.pub
        </div>
      </label>
      <div
        className={"text-sm italic "}
        style={{
          fontWeight: props.domainState.status === "valid" ? "bold" : "normal",
          color:
            props.domainState.status === "valid"
              ? theme.colors["accent-contrast"]
              : theme.colors.tertiary,
        }}
      >
        {props.domainState.status === "valid"
          ? "Available!"
          : props.domainState.status === "error"
            ? props.domainState.message
            : props.domainState.status === "invalid"
              ? "Already Taken ):"
              : props.domainState.status === "pending"
                ? "Checking Availability..."
                : "a-z, 0-9, and - only!"}
      </div>
    </div>
  );
}
