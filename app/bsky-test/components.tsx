"use client";
import { useState } from "react";
import { createRecord } from "./createRecord";
import { createPublication } from "./createPublication";

export function CreateDocument() {
  return (
    <button
      onClick={() => {
        console.log(createRecord());
      }}
    >
      press me
    </button>
  );
}

export function CreatePublication() {
  let [state, setState] = useState("");
  return (
    <div>
      <form>
        <input
          type="text"
          value={state}
          onChange={(e) => setState(e.target.value)}
          placeholder="Enter name"
        />
        <button
          type="submit"
          onClick={(e) => {
            e.preventDefault();
            createPublication(state);
          }}
        >
          Submit
        </button>
      </form>
    </div>
  );
}
