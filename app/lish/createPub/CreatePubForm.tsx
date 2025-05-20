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
import { getPublicationURL } from "./getPublicationURL";
import { string } from "zod";

export const CreatePubForm = () => {
  let [nameValue, setNameValue] = useState("");
  let [descriptionValue, setDescriptionValue] = useState("");
  let [logoFile, setLogoFile] = useState<File | null>(null);
  let [logoPreview, setLogoPreview] = useState<string | null>(null);
  let [domainValue, setDomainValue] = useState("");
  let fileInputRef = useRef<HTMLInputElement>(null);

  let router = useRouter();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!subdomainValidator.safeParse(domainValue).success) return;
        let data = await createPublication({
          name: nameValue,
          description: descriptionValue,
          iconFile: logoFile,
          subdomain: domainValue,
        });
        if (data?.publication)
          router.push(`${getPublicationURL(data.publication)}/dashboard`);
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
      <DomainInput domain={domainValue} setDomain={setDomainValue} />

      <div className="flex w-full justify-center">
        <ButtonPrimary type="submit">Create Publication!</ButtonPrimary>
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
}) {
  type DomainState =
    | { status: "empty" }
    | { status: "valid" }
    | { status: "invalid" }
    | { status: "pending" }
    | { status: "error"; message: string };

  let [state, setState] = useState<DomainState>({ status: "empty" });

  useEffect(() => {
    if (!props.domain) {
      setState({ status: "empty" });
    } else {
      let valid = subdomainValidator.safeParse(props.domain);
      if (!valid.success) {
        let reason = valid.error.errors[0].code;
        setState({
          status: "error",
          message:
            reason === "too_small"
              ? "Must be at least 3 characters long"
              : reason === "invalid_string"
                ? "Must contain only lowercase letters, numbers, and dashes"
                : "",
        });
        return;
      }
      setState({ status: "pending" });
    }
  }, [props.domain]);

  useDebouncedEffect(
    async () => {
      if (!props.domain) return setState({ status: "empty" });

      let valid = subdomainValidator.safeParse(props.domain);
      if (!valid.success) {
        return;
      }
      let status = await callRPC("get_leaflet_subdomain_status", {
        domain: props.domain,
      });
      console.log(status);
      if (status.error === "Not Found") setState({ status: "valid" });
      else setState({ status: "invalid" });
    },
    500,
    [props.domain],
  );

  return (
    <div className="flex flex-col gap-1">
      <label className=" input-with-border flex flex-col text-sm text-tertiary font-bold italic leading-tight !py-1 !px-[6px]">
        <div>Domain</div>
        <div className="flex flex-row  items-center">
          <Input
            minLength={3}
            maxLength={63}
            placeholder="domain"
            className="appearance-none w-full font-normal bg-transparent text-base text-primary focus:outline-0 outline-none"
            value={props.domain}
            onChange={(e) => props.setDomain(e.currentTarget.value)}
          />
          .leaflet.pub
        </div>
      </label>
      <div
        className={"text-sm italic "}
        style={{
          fontWeight: state.status === "valid" ? "bold" : "normal",
          color:
            state.status === "valid"
              ? theme.colors["accent-contrast"]
              : theme.colors.tertiary,
        }}
      >
        {state.status === "valid"
          ? "Available!"
          : state.status === "error"
            ? state.message
            : state.status === "invalid"
              ? "Already Taken ):"
              : state.status === "pending"
                ? "Checking Availability..."
                : "Choose a domain! Numbers, characters, and hyphens only!"}
      </div>
    </div>
  );
}
