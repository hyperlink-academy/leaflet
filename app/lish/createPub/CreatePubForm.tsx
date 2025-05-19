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
import { set } from "colorjs.io/fn";
import { theme } from "tailwind.config";

export const CreatePubForm = () => {
  let [nameValue, setNameValue] = useState("");
  let [descriptionValue, setDescriptionValue] = useState("");
  let [logoFile, setLogoFile] = useState<File | null>(null);
  let [logoPreview, setLogoPreview] = useState<string | null>(null);
  let [domainValue, setDomainValue] = useState("");
  let fileInputRef = useRef<HTMLInputElement>(null);

  let router = useRouter();
  let { identity } = useIdentityData();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        // Note: You'll need to update the createPublication function to handle the logo file
        await createPublication({
          name: nameValue,
          description: descriptionValue,
          iconFile: logoFile,
        });
        router.push(
          `/lish/${identity?.resolved_did?.alsoKnownAs?.[0].slice(5)}/${nameValue}/dashboard`,
        );
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

function DomainInput(props: {
  domain: string;
  setDomain: (d: string) => void;
}) {
  let [state, setState] = useState<"empty" | "valid" | "invalid" | "pending">(
    "empty",
  );
  useEffect(() => {
    if (!props.domain) {
      setState("empty");
    } else {
      setState("pending");
    }
  }, [props.domain]);
  useDebouncedEffect(
    async () => {
      if (!props.domain) return setState("empty");
      let status = await callRPC("get_leaflet_subdomain_status", {
        domain: props.domain,
      });
      console.log(status);
      if (status.error === "Not Found") setState("valid");
      else setState("invalid");
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
          fontWeight: state === "valid" ? "bold" : "normal",
          color:
            state === "valid"
              ? theme.colors["accent-contrast"]
              : theme.colors.tertiary,
        }}
      >
        {state === "valid"
          ? "Available!"
          : state === "invalid"
            ? "Already Taken ):"
            : state === "pending"
              ? "Checking Availability..."
              : "Choose a domain!"}
      </div>
    </div>
  );
}
