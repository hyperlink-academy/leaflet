"use client";
import { useState } from "react";
import { ToggleGroup } from "components/ToggleGroup";

type DemoTab = "write" | "track" | "read";

export function Demo() {
  let [value, setValue] = useState<DemoTab>("write");
  return (
    <div className="mx-auto pt-12 flex flex-col gap-4 w-full justify-center">
      <ToggleGroup
        fullWidth
        className="bg-[#F1EDE5]! text-lg! w-md mx-auto"
        selectedOptionClassName="bg-[#686153]! text-white!"
        optionClassName="text-[#969696]! "
        value={value}
        onChange={setValue}
        options={[
          { value: "track", label: "Track" },
          { value: "write", label: "Write" },
          { value: "read", label: "Read" },
        ]}
      />
      <div className="bg-[#F1EDE5] w-full h-[80vh] border-border rounded-lg" />
    </div>
  );
}
