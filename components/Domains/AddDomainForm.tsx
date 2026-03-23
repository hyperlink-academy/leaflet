"use client";
import { useState } from "react";
import { ButtonPrimary } from "components/Buttons";
import { Input } from "components/Input";
import { useSmoker } from "components/Toast";
import { useIdentityData } from "components/IdentityProvider";
import { addDomain } from "actions/domains/addDomain";
import { DotLoader } from "components/utils/DotLoader";
import { GoToArrow } from "components/Icons/GoToArrow";

export function AddDomainForm(props: {
  onDomainAdded: (domain: string) => void;
  onBack: () => void;
}) {
  let [value, setValue] = useState("");
  let [loading, setLoading] = useState(false);
  let { mutate } = useIdentityData();
  let smoker = useSmoker();
  let rect = document
    .getElementById("add-domain-button")
    ?.getBoundingClientRect();

  return (
    <form
      className="flex flex-col gap-1 max-w-full"
      onSubmit={async (e) => {
        setLoading(true);
        let { error } = await addDomain(value);
        if (error) {
          setLoading(false);
          smoker({
            error: true,
            text:
              error === "invalid_domain"
                ? "Invalid domain! Use just the base domain"
                : error === "domain_already_in_use"
                  ? "That domain is already in use!"
                  : "An unknown error occured",
            position: {
              y: rect ? rect?.right - rect?.width / 2 : 0,
              x: rect ? rect?.bottom - rect?.height / 2 : 0,
            },
          });
          return;
        }
        mutate();
        props.onDomainAdded(value);
      }}
    >
      <div className="flex justify-between">
        <h3>Add a Domain</h3>
        <button
          className="text-accent-contrast"
          onMouseDown={() => props.onBack()}
          type="button"
        >
          <GoToArrow className="rotate-180" />
        </button>
      </div>
      <div className="text-sm text-secondary">
        <div className="font-bold">Just include the base domain</div>
        Don't include the protocol{" "}
        <span className="text-tertiary">(like https://) </span>
        or path <span className="text-tertiary">(you can add that later)</span>
      </div>

      <Input
        className="input-with-border text-primary"
        autoFocus
        placeholder="www.example.com"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />

      <div className="flex justify-end items-center mt-2">
        <ButtonPrimary
          id="add-domain-button"
          type="submit"
          disabled={!value || loading}
        >
          {loading ? <DotLoader /> : "Add Domain"}
        </ButtonPrimary>
      </div>
    </form>
  );
}
