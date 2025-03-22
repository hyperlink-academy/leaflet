import { LishHome } from "./LishHome";
import { createClient } from "@supabase/supabase-js";
import { Database } from "supabase/database.types";
import { AtpBaseClient, PubLeafletPagesLinearDocument } from "lexicons/src";
import { CredentialSession } from "@atproto/api";
import { createOauthClient } from "src/atproto-oauth";
import { getIdentityData } from "actions/getIdentityData";
import Link from "next/link";
import { IdResolver } from "@atproto/identity";

export default function Lish() {
  return <LishHome />;
}
