import { supabaseServerClient } from "supabase/serverClient";
import { inngest, events } from "../client";
import { AtpAgent, AtUri } from "@atproto/api";
import { Json } from "supabase/database.types";
import { ids } from "lexicons/api/lexicons";

export const come_online = inngest.createFunction(
  {
    id: "come_online",
    triggers: [events.appviewComeOnline],
  },
  async ({ event, step }) => {
    return { online: true };
  },
);
