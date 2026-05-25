import { Suspense } from "react";
import { LegalContent } from "./content";

export default function Legal() {
  return (
    <div className="w-full min-h-full h-fit bg-bg-leaflet">
      <Suspense>
        <LegalContent />
      </Suspense>
    </div>
  );
}
