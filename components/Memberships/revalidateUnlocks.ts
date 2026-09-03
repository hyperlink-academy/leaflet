"use client";
import { mutate } from "swr";

// A join or a plan change can entitle the viewer to gated posts — revalidate
// any members-only unlock islands on the page (keyed in PostDataProvider) so
// the full post renders in place instead of behind the paywall.
export const revalidateUnlocks = () =>
  mutate((key) => Array.isArray(key) && key[0] === "unlocked-post");
