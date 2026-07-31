"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { Input } from "components/Input";
import { Modal } from "components/Modal";
import { DotLoader } from "components/utils/DotLoader";
import { useToaster } from "components/Toast";
import {
  searchUsers,
  grantEntitlement,
  revokeEntitlement,
  revokeAllForKey,
  type AdminUserSearchResult,
  type AdminEntitlementError,
} from "actions/admin/entitlements";

export type GrantRow = {
  identity_id: string;
  entitlement_key: string;
  granted_at: string;
  expires_at: string | null;
  source: string | null;
  email: string | null;
  atp_did: string | null;
  handle: string | null;
};

export type KeySummary = {
  key: string;
  holders: number;
  knownToCode: boolean;
};

const ERROR_MESSAGES: Record<AdminEntitlementError, string> = {
  unauthorized: "You're not allowed to do that.",
  invalid_input: "That input doesn't look right.",
  database_error: "Something went wrong. Please try again.",
};

export function AdminEntitlements(props: {
  grants: GrantRow[];
  keys: KeySummary[];
}) {
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-8 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h2>Entitlements</h2>
        <div className="text-secondary leading-snug">
          Grant and revoke per-user feature flags. Search for a user by email,
          Bluesky handle, or DID.
        </div>
      </div>
      <datalist id="entitlement-keys">
        {props.keys.map((k) => (
          <option key={k.key} value={k.key} />
        ))}
      </datalist>
      <KeysList keys={props.keys} />
      <UserSearch />
      <GrantsList grants={props.grants} />
    </div>
  );
}

function KeysList(props: { keys: KeySummary[] }) {
  return (
    <div className="flex flex-col gap-3">
      <h3>Entitlement keys</h3>
      <div className="flex flex-col gap-2">
        {props.keys.map((k) => (
          <KeyRow key={k.key} summary={k} />
        ))}
      </div>
    </div>
  );
}

function KeyRow(props: { summary: KeySummary }) {
  let toaster = useToaster();
  let router = useRouter();
  let { key, holders, knownToCode } = props.summary;
  let [pickerOpen, setPickerOpen] = useState(false);
  let [confirmOpen, setConfirmOpen] = useState(false);
  let [revoking, setRevoking] = useState(false);

  let revokeAll = async () => {
    if (revoking) return;
    setRevoking(true);
    let res = await revokeAllForKey({ key });
    setRevoking(false);
    if (!res.ok) {
      toaster({ type: "error", content: ERROR_MESSAGES[res.error] });
      return;
    }
    toaster({
      type: "success",
      content: `Revoked ${key} from ${res.value.removed} user${res.value.removed === 1 ? "" : "s"}`,
    });
    setConfirmOpen(false);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-2 border border-border-light rounded-md px-3 py-2">
      <div className="flex items-center gap-3">
        <div className="flex flex-col min-w-0 grow leading-snug">
          <div className="font-mono font-bold text-sm text-primary truncate">
            {key}
          </div>
          <div className="text-xs text-tertiary">
            {holders} holder{holders === 1 ? "" : "s"}
            {!knownToCode && " · not checked anywhere in code"}
          </div>
        </div>
        <ButtonSecondary compact onClick={() => setPickerOpen((o) => !o)}>
          {pickerOpen ? "Close" : "Grant…"}
        </ButtonSecondary>
        <Modal
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          asChild
          title={`Revoke ${key} from everyone?`}
          trigger={
            <ButtonSecondary compact disabled={holders === 0}>
              Revoke all
            </ButtonSecondary>
          }
        >
          <div className="text-secondary flex flex-col gap-2 max-w-sm">
            <p>
              This deletes all {holders} grant{holders === 1 ? "" : "s"} of{" "}
              <span className="font-mono font-bold">{key}</span>, including any
              created automatically (e.g. by Stripe subscriptions).
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <ButtonSecondary
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={revoking}
              >
                Cancel
              </ButtonSecondary>
              <ButtonPrimary
                type="button"
                onClick={revokeAll}
                disabled={revoking}
              >
                {revoking ? <DotLoader /> : "Revoke all"}
              </ButtonPrimary>
            </div>
          </div>
        </Modal>
      </div>
      {pickerOpen && (
        <KeyGrantPicker
          entitlementKey={key}
          onGranted={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

function KeyGrantPicker(props: {
  entitlementKey: string;
  onGranted: () => void;
}) {
  let toaster = useToaster();
  let router = useRouter();
  let [busy, setBusy] = useState(false);

  let grant = async (user: AdminUserSearchResult) => {
    if (busy) return;
    setBusy(true);
    let res = await grantEntitlement({
      identityId: user.id,
      key: props.entitlementKey,
    });
    setBusy(false);
    if (!res.ok) {
      toaster({ type: "error", content: ERROR_MESSAGES[res.error] });
      return;
    }
    toaster({
      type: "success",
      content: `Granted ${props.entitlementKey} to ${userLabel(user)}`,
    });
    props.onGranted();
    router.refresh();
  };

  return (
    <UserSearchResults
      renderResult={(user) => {
        let alreadyHas = user.entitlements.some(
          (e) => e.entitlement_key === props.entitlementKey,
        );
        return (
          <div className="flex items-center gap-2 border border-border-light rounded-md px-2 py-1.5">
            <div className="flex flex-col min-w-0 grow leading-snug">
              <div className="font-bold text-primary text-sm truncate">
                {user.displayName || userLabel(user)}
              </div>
              <div className="text-tertiary text-xs flex flex-wrap gap-x-2">
                {user.email && <span>{user.email}</span>}
                {user.handle && <span>@{user.handle}</span>}
                {user.atp_did && (
                  <span className="font-mono">{user.atp_did}</span>
                )}
              </div>
            </div>
            <ButtonPrimary
              compact
              disabled={busy || alreadyHas}
              onClick={() => grant(user)}
            >
              {alreadyHas ? "Granted" : busy ? <DotLoader /> : "Grant"}
            </ButtonPrimary>
          </div>
        );
      }}
    />
  );
}

function userLabel(user: AdminUserSearchResult) {
  return (
    user.email || (user.handle && `@${user.handle}`) || user.atp_did || user.id
  );
}

// Search input + results; the caller renders each result row and can push
// back an updated user (e.g. after a grant/revoke) to keep results in sync.
function UserSearchResults(props: {
  renderResult: (
    user: AdminUserSearchResult,
    update: (user: AdminUserSearchResult) => void,
  ) => React.ReactNode;
}) {
  let toaster = useToaster();
  let [query, setQuery] = useState("");
  let [searching, setSearching] = useState(false);
  let [results, setResults] = useState<AdminUserSearchResult[] | null>(null);

  let runSearch = async () => {
    let q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    let res = await searchUsers(q);
    setSearching(false);
    if (!res.ok) {
      toaster({ type: "error", content: ERROR_MESSAGES[res.error] });
      return;
    }
    setResults(res.value);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="input-with-border py-0! flex items-center gap-2 w-full">
        <Input
          className="appearance-none! grow outline-none! min-w-0 py-1!"
          placeholder="email, handle.bsky.social, or did:plc:…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              runSearch();
            }
          }}
        />
        <ButtonSecondary
          compact
          type="button"
          disabled={!query.trim() || searching}
          onClick={runSearch}
        >
          {searching ? <DotLoader /> : "Search"}
        </ButtonSecondary>
      </div>
      {results?.length === 0 && (
        <div className="text-tertiary text-sm">No users found.</div>
      )}
      {results?.map((user) => (
        <React.Fragment key={user.id}>
          {props.renderResult(user, (updated) =>
            setResults(
              (rs) => rs?.map((r) => (r.id === updated.id ? updated : r)) ?? rs,
            ),
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function UserSearch() {
  return (
    <div className="flex flex-col gap-3">
      <h3>Find a user</h3>
      <UserSearchResults
        renderResult={(user, update) => (
          <UserCard user={user} onChange={update} />
        )}
      />
    </div>
  );
}

function UserCard(props: {
  user: AdminUserSearchResult;
  onChange: (user: AdminUserSearchResult) => void;
}) {
  let toaster = useToaster();
  let router = useRouter();
  let { user } = props;
  let [key, setKey] = useState("");
  let [expires, setExpires] = useState("");
  let [busy, setBusy] = useState(false);

  let grant = async () => {
    if (!key.trim() || busy) return;
    setBusy(true);
    let res = await grantEntitlement({
      identityId: user.id,
      key,
      expiresAt: expires || null,
    });
    setBusy(false);
    if (!res.ok) {
      toaster({ type: "error", content: ERROR_MESSAGES[res.error] });
      return;
    }
    toaster({
      type: "success",
      content: `Granted ${res.value.entitlement_key}`,
    });
    props.onChange({
      ...user,
      entitlements: [
        ...user.entitlements.filter(
          (e) => e.entitlement_key !== res.value.entitlement_key,
        ),
        res.value,
      ],
    });
    setKey("");
    setExpires("");
    router.refresh();
  };

  let revoke = async (entitlement_key: string) => {
    if (busy) return;
    setBusy(true);
    let res = await revokeEntitlement({
      identityId: user.id,
      key: entitlement_key,
    });
    setBusy(false);
    if (!res.ok) {
      toaster({ type: "error", content: ERROR_MESSAGES[res.error] });
      return;
    }
    toaster({ type: "success", content: `Revoked ${entitlement_key}` });
    props.onChange({
      ...user,
      entitlements: user.entitlements.filter(
        (e) => e.entitlement_key !== entitlement_key,
      ),
    });
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3 border border-border-light rounded-md p-3">
      <div className="flex flex-col leading-snug">
        <div className="font-bold text-primary text-sm truncate">
          {user.displayName || user.email || user.handle || user.atp_did}
        </div>
        <div className="text-tertiary text-xs flex flex-wrap gap-x-2">
          {user.email && <span>{user.email}</span>}
          {user.handle && <span>@{user.handle}</span>}
          {user.atp_did && <span className="font-mono">{user.atp_did}</span>}
        </div>
      </div>

      {user.entitlements.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {user.entitlements.map((e) => (
            <div
              key={e.entitlement_key}
              className="flex items-center gap-1.5 border border-border-light rounded-md px-1.5 py-0.5 text-xs"
            >
              <span className="font-mono text-primary">
                {e.entitlement_key}
              </span>
              {e.expires_at && (
                <span className="text-tertiary italic">
                  until {e.expires_at.slice(0, 10)}
                </span>
              )}
              <button
                type="button"
                className="text-tertiary hover:text-accent-1 font-bold"
                disabled={busy}
                onClick={() => revoke(e.entitlement_key)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-tertiary text-sm">No entitlements.</div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="input-with-border grow min-w-0 py-1! text-sm font-mono"
          placeholder="entitlement key"
          value={key}
          list="entitlement-keys"
          autoComplete="off"
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              grant();
            }
          }}
        />
        <label className="flex items-center gap-1 text-xs text-tertiary">
          expires
          <Input
            type="date"
            className="input-with-border py-1! text-sm"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
          />
        </label>
        <ButtonPrimary compact disabled={!key.trim() || busy} onClick={grant}>
          {busy ? <DotLoader /> : "Grant"}
        </ButtonPrimary>
      </div>
    </div>
  );
}

function GrantsList(props: { grants: GrantRow[] }) {
  let toaster = useToaster();
  let router = useRouter();
  let [busyRow, setBusyRow] = useState<string | null>(null);

  let revoke = async (row: GrantRow) => {
    let rowKey = `${row.identity_id}:${row.entitlement_key}`;
    if (busyRow) return;
    setBusyRow(rowKey);
    let res = await revokeEntitlement({
      identityId: row.identity_id,
      key: row.entitlement_key,
    });
    setBusyRow(null);
    if (!res.ok) {
      toaster({ type: "error", content: ERROR_MESSAGES[res.error] });
      return;
    }
    toaster({ type: "success", content: `Revoked ${row.entitlement_key}` });
    router.refresh();
  };

  let now = new Date().toISOString();

  return (
    <div className="flex flex-col gap-3">
      <h3>All grants</h3>
      {props.grants.length === 0 ? (
        <div className="text-tertiary text-sm">No entitlements granted.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {props.grants.map((row) => {
            let rowKey = `${row.identity_id}:${row.entitlement_key}`;
            let expired = !!row.expires_at && row.expires_at < now;
            return (
              <div
                key={rowKey}
                className="flex items-center gap-3 border border-border-light rounded-md px-3 py-2"
              >
                <div className="flex flex-col min-w-0 grow leading-snug">
                  <div className="text-sm text-primary truncate">
                    <span className="font-mono font-bold">
                      {row.entitlement_key}
                    </span>
                    {expired && (
                      <span className="text-tertiary italic"> (expired)</span>
                    )}
                  </div>
                  <div className="text-xs text-tertiary truncate">
                    {row.email ||
                      (row.handle && `@${row.handle}`) ||
                      row.atp_did}
                    {row.email && row.handle && ` · @${row.handle}`}
                  </div>
                  <div className="text-xs text-tertiary">
                    {row.source && `via ${row.source} · `}granted{" "}
                    {row.granted_at.slice(0, 10)}
                    {row.expires_at &&
                      ` · expires ${row.expires_at.slice(0, 10)}`}
                  </div>
                </div>
                <ButtonSecondary
                  compact
                  disabled={busyRow === rowKey}
                  onClick={() => revoke(row)}
                >
                  {busyRow === rowKey ? <DotLoader /> : "Revoke"}
                </ButtonSecondary>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
