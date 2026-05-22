import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServerClient } from "supabase/serverClient";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import {
  confirmIdentityMerge,
  cancelIdentityMerge,
} from "actions/mergeIdentity";
import {
  AUTH_TOKEN_COOKIE,
  PENDING_MERGE_TOKEN_COOKIE,
  resolveAuthToken,
} from "src/auth";

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function MergeAccountsPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const search = await props.searchParams;
  const redirectParam = typeof search.redirect === "string" ? search.redirect : "/";

  const jar = await cookies();
  const [source, target] = await Promise.all([
    resolveAuthToken(jar.get(AUTH_TOKEN_COOKIE)?.value),
    resolveAuthToken(jar.get(PENDING_MERGE_TOKEN_COOKIE)?.value),
  ]);

  const mergeValid =
    source &&
    target &&
    source.identity.id !== target.identity.id &&
    !source.identity.atp_did &&
    source.identity.email &&
    target.identity.atp_did;

  if (!mergeValid) {
    return (
      <div className="w-screen min-h-screen flex place-items-center bg-bg-leaflet p-4">
        <div className="bg-bg-page mx-auto p-6 border border-border rounded-md flex flex-col gap-4 w-full max-w-md">
          <h2 className="text-primary">Merge no longer pending</h2>
          <p className="text-secondary text-sm">
            This merge link has expired or is no longer valid. Please try
            signing in again.
          </p>
          <div className="flex justify-end">
            <form
              action={async () => {
                "use server";
                await cancelIdentityMerge();
                redirect(redirectParam);
              }}
            >
              <ButtonPrimary type="submit">Continue</ButtonPrimary>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const [{ data: bsky }, { count: docCount }] = await Promise.all([
    supabaseServerClient
      .from("bsky_profiles")
      .select("handle")
      .eq("did", target.identity.atp_did!)
      .maybeSingle(),
    supabaseServerClient
      .from("permission_token_on_homepage")
      .select("token", { count: "exact", head: true })
      .eq("identity", source.identity.id)
      .not("archived", "is", true),
  ]);
  const targetHandle = bsky?.handle ?? target.identity.atp_did!;
  const sourceEmail = source.identity.email!;
  const targetEmail = target.identity.email;
  const documents = docCount ?? 0;

  async function onConfirm() {
    "use server";
    const res = await confirmIdentityMerge();
    if (!res.ok) redirect("/merge-accounts?error=" + res.error);
    redirect(redirectParam);
  }

  async function onCancel() {
    "use server";
    await cancelIdentityMerge();
    redirect(redirectParam);
  }

  return (
    <div className="w-screen min-h-screen flex place-items-center bg-bg-leaflet p-4">
      <div className="bg-bg-page mx-auto p-6 border border-border rounded-md flex flex-col gap-4 w-full max-w-md">
        <h2 className="text-primary">Merge accounts?</h2>
        <div className="flex flex-col gap-2 text-secondary leading-snug">
          <p>
            You're signed in as{" "}
            <span className="italic">{sourceEmail}</span>.
          </p>
          <p>
            You just signed in with Bluesky as{" "}
            <span className="font-bold">@{targetHandle}</span>
            {targetEmail ? (
              <>
                , which is already a Leaflet account with email{" "}
                <span className="italic">{targetEmail}</span>
              </>
            ) : (
              <>, which is already a Leaflet account</>
            )}
            .
          </p>
          <p>
            Merging moves everything from{" "}
            <span className="italic">{sourceEmail}</span> into{" "}
            <span className="font-bold">@{targetHandle}</span>. Nothing
            will be lost.
          </p>
        </div>

        <div className="flex flex-col gap-1 text-secondary text-sm accent-container p-3">
          <div className="text-tertiary uppercase text-xs font-bold">
            After merging
          </div>
          {documents > 0 && (
            <div>
              Your {documents} {documents === 1 ? "document" : "documents"}{" "}
              will belong to{" "}
              <span className="font-bold">@{targetHandle}</span>
            </div>
          )}
          <div>
            You'll sign in to{" "}
            <span className="font-bold">@{targetHandle}</span> with{" "}
            <span className="italic">{sourceEmail}</span>
            {targetEmail && (
              <>
                {" "}
                (<span className="italic">{targetEmail}</span> will no
                longer work)
              </>
            )}{" "}
            or Bluesky
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <form action={onCancel}>
            <ButtonSecondary type="submit">Cancel</ButtonSecondary>
          </form>
          <form action={onConfirm}>
            <ButtonPrimary type="submit">Merge accounts</ButtonPrimary>
          </form>
        </div>
      </div>
    </div>
  );
}
