import Link from "next/link";
import { useState } from "react";

export const isSubscribed = true;
export const isWriter = false;

export const LishHome = () => {
  return (
    <div className="w-full h-fit min-h-full p-4 bg-bg-leaflet">
      <div className="flex flex-col gap-2 max-w-prose w-full mx-auto">
        Home For Now... Call it a sublet
        <Link href="./lish/publication">Publication Here</Link>
        <Link href="./lish/post">Post Here</Link>
      </div>
    </div>
  );
};
