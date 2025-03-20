import { CreatePubForm } from "./CreatePubForm";
import { createClient } from "@supabase/supabase-js";
import { Database } from "supabase/database.types";
import { IdResolver } from "@atproto/identity";

export default function CreatePub() {
  const idResolver = new IdResolver();

  let supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  );

  return (
    <div className="createPubPage relative w-full h-screen flex items-stretch bg-bg-leaflet p-4">
      <div className="createPubContent h-full flex items-center max-w-sm w-full mx-auto ">
        <div className="createPubFormWrapper h-fit w-full flex flex-col gap-4">
          <h2 className="text-center">Create a New Publication</h2>
          <CreatePubForm />
        </div>
      </div>
    </div>
  );
}
