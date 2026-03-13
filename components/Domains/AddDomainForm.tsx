"use client";
import { useState } from "react";
import { ButtonPrimary } from "components/Buttons";
import { Input } from "components/Input";
import { useSmoker } from "components/Toast";
import { useIdentityData } from "components/IdentityProvider";
import { addDomain } from "actions/domains/addDomain";

export function AddDomainForm(props: {
  onDomainAdded: (domain: string) => void;
  onBack: () => void;
}) {
  let [value, setValue] = useState("");
  let { mutate } = useIdentityData();
  let smoker = useSmoker();

  return (
    <div className="flex flex-col gap-1 max-w-full">
      <div>
        <h3 className="text-secondary">Add a New Domain</h3>
        <div className="text-xs italic text-secondary">
          Don&apos;t include the protocol or path, just the base domain name
        </div>
      </div>

      <Input
        className="input-with-border text-primary"
        placeholder="www.example.com"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />

      <div className="flex justify-between items-center mt-2">
        <button
          className="text-accent-contrast"
          onMouseDown={() => props.onBack()}
          type="button"
        >
          Back
        </button>
        <ButtonPrimary
          disabled={!value}
          onMouseDown={async (e) => {
            let { error } = await addDomain(value);
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
              return;
            }
            mutate();
            props.onDomainAdded(value);
          }}
        >
          Verify Domain
        </ButtonPrimary>
      </div>
    </div>
  );
}
