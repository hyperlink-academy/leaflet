"use server";

import { getIdentityData } from "./getIdentityData";
import { supabaseServerClient } from "supabase/serverClient";
import { Ok, Err, type Result } from "src/result";
import {
  syncConnectedAccountState,
  type ConnectedAccountState,
} from "stripe/connect";

export async function refreshStripeConnectAccount(): Promise<
  Result<ConnectedAccountState, string>
> {
  const identity = await getIdentityData();
  if (!identity) return Err("Not authenticated");

  const { data: row } = await supabaseServerClient
    .from("stripe_connected_accounts")
    .select("stripe_account_id")
    .eq("identity_id", identity.id)
    .single();
  if (!row?.stripe_account_id) return Err("No connected account");

  const state = await syncConnectedAccountState(row.stripe_account_id);
  return Ok(state);
}
