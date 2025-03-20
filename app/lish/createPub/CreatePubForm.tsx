"use client";
import { ButtonPrimary } from "components/Buttons";
import { InputWithLabel } from "components/Input";
import Link from "next/link";
import { useState } from "react";

export const CreatePubForm = () => {
  let [nameValue, setNameValue] = useState("");
  let [descriptionValue, setDescriptionValue] = useState("");
  return (
    <form
      className="createPubForm w-full flex flex-col gap-3 bg-bg-page rounded-lg p-3 border border-border-light"
      onSubmit={() => {}}
    >
      <InputWithLabel
        type="text"
        id="pubName"
        label="Name"
        value={nameValue}
        onChange={(e) => {
          setNameValue(e.currentTarget.value);
        }}
      />

      <InputWithLabel
        label="Description"
        textarea
        rows={3}
        id="pubDescription"
        value={descriptionValue}
        onChange={(e) => {
          setDescriptionValue(e.currentTarget.value);
        }}
      />
      <div className="flex justify-between items-center">
        <Link
          className="hover:no-underline font-bold text-accent-contrast"
          href="./"
        >
          Nevermind
        </Link>
        <ButtonPrimary className="place-self-end" type="submit">
          Create!
        </ButtonPrimary>
      </div>
    </form>
  );
};
