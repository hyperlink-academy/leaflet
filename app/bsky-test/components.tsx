"use client";
import { useState } from "react";
import { createPublication } from "./createPublication";

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
          create a publication
        </button>
      </form>
    </div>
  );
}
