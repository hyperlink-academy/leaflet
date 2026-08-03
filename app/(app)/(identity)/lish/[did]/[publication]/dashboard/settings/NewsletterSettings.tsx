"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ButtonPrimary,
  ButtonSecondary,
  ButtonTertiary,
} from "components/Buttons";
import { DotLoader } from "components/utils/DotLoader";
import { Modal } from "components/Modal";
import { encodeActionToSearchParam } from "app/api/oauth/[route]/afterSignInActions";
import { EmailConfirm } from "components/Subscribe/EmailSubscribe";
import { Input } from "components/Input";
import { SettingsSection } from "components/SettingsLayout";
import {
  useNormalizedPublicationRecord,
  usePublicationData,
} from "../PublicationSWRProvider";
import { useToaster } from "components/Toast";
import {
  clearReplyToEmail,
  confirmReplyToVerification,
  disableNewsletter,
  enableNewsletter,
  setReplyToEmail,
} from "actions/publications/newsletterSettings";
import {
  NO_REPLY_EMAIL,
  buildFromAddress,
  resolveFromDomain,
} from "src/utils/newsletterSender";

export const NewsletterSettings = () => {
  let { data, mutate } = usePublicationData();
  let record = useNormalizedPublicationRecord();

  let publicationUri = data?.publication?.uri;
  let settings = data?.publication?.publication_newsletter_settings;
  let newsletterEnabled = settings?.enabled ?? false;

  if (!publicationUri) return null;

  return (
    <>
      <EnableNewsletterSection
        publicationUri={publicationUri}
        enabled={newsletterEnabled}
        mutate={mutate}
      />
      {newsletterEnabled && (
        <NewsletterOptions
          publicationUri={publicationUri}
          settings={settings}
          fromName={record?.name || ""}
          pubUrl={record?.url}
          firstDomain={data?.publication?.publication_domains?.[0]?.domain}
          mutate={mutate}
        />
      )}
      <SettingsSection title="Embeddable Subscribe Form">
        <EmbedFormSnippet
          publicationUri={publicationUri}
          publicationUrl={record?.url}
        />
      </SettingsSection>
    </>
  );
};

function EnableNewsletterSection(props: {
  publicationUri: string;
  enabled: boolean;
  mutate: ReturnType<typeof usePublicationData>["mutate"];
}) {
  let toaster = useToaster();
  let [pending, setPending] = useState(false);

  if (!props.enabled) {
    return (
      <div className="accent-container flex flex-col gap-2 p-3 sm:px-4">
        <div className="leading-snug font-bold">
          Enable Newsletters to send email updates to your subscribers!
        </div>
        <div className="leading-snug text-sm">
          Your first 1k email subscribers are included with Leaflet Pro. After
          that, it&apos;s $5 for each additional 1k subs. Questions? Reach out!
        </div>
        <ButtonPrimary
          className="self-start"
          disabled={pending}
          onClick={async () => {
            if (pending) return;
            setPending(true);
            let res = await enableNewsletter(props.publicationUri);
            setPending(false);
            if (!res.ok) {
              toaster({
                type: "error",
                content: "Failed to enable newsletter.",
              });
              return;
            }
            toaster({ type: "success", content: "Newsletter enabled!" });
            await props.mutate();
          }}
        >
          {pending ? <DotLoader /> : "Enable Newsletters"}
        </ButtonPrimary>
      </div>
    );
  }

  return (
    <SettingsSection>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-secondary leading-snug">
          Newsletters are enabled! Your subscribers can opt into email updates.
        </div>
        <ButtonTertiary
          disabled={pending}
          onClick={async () => {
            if (pending) return;
            setPending(true);
            let res = await disableNewsletter(props.publicationUri);
            setPending(false);
            if (!res.ok) {
              toaster({
                type: "error",
                content: "Failed to disable newsletter.",
              });
              return;
            }
            toaster({ type: "success", content: "Newsletter disabled." });
            await props.mutate();
          }}
        >
          {pending ? <DotLoader /> : "Disable Newsletters"}
        </ButtonTertiary>
      </div>
    </SettingsSection>
  );
}

function NewsletterOptions(props: {
  publicationUri: string;
  settings:
    | {
        enabled: boolean;
        reply_to_email: string | null;
        reply_to_verified_at: string | null;
      }
    | null
    | undefined;
  fromName: string;
  pubUrl: string | undefined;
  firstDomain: string | undefined;
  mutate: ReturnType<typeof usePublicationData>["mutate"];
}) {
  let toaster = useToaster();
  let fromAddress = useMemo(() => {
    let domain = resolveFromDomain(props.pubUrl, props.firstDomain);
    return domain ? buildFromAddress(domain) : null;
  }, [props.pubUrl, props.firstDomain]);

  let savedReplyTo = props.settings?.reply_to_email ?? "";
  let pendingVerification =
    !!props.settings?.reply_to_email && !props.settings?.reply_to_verified_at;

  let [replyToValue, setReplyToValue] = useState(savedReplyTo);
  let [savingReplyTo, setSavingReplyTo] = useState(false);
  let [confirming, setConfirming] = useState(false);
  let [verifyOpen, setVerifyOpen] = useState(false);

  useEffect(() => {
    setReplyToValue(savedReplyTo);
  }, [savedReplyTo]);
  useEffect(() => {
    setVerifyOpen(pendingVerification);
  }, [pendingVerification]);

  let replyToDirty =
    replyToValue.trim().toLowerCase() !== savedReplyTo.toLowerCase();

  return (
    <SettingsSection title="Options">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-secondary font-bold">From Name</p>
          <div className="input-with-border w-full max-w-prose text-tertiary bg-border-light px-2 py-1 rounded-md">
            {props.fromName || "—"}
          </div>
          <p className="text-tertiary text-sm leading-snug">
            The publication name is used as the sender name.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-secondary font-bold">From Email</p>
          <div className="input-with-border w-full max-w-prose text-tertiary bg-border-light px-2 py-1 rounded-md">
            {fromAddress || "—"}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label
            className="text-secondary font-bold"
            htmlFor="newsletterReplyTo"
          >
            Reply-to Email{" "}
            <span className="font-normal text-tertiary">(optional)</span>
          </label>
          <p className="text-tertiary text-sm leading-snug">
            Where subscriber replies are sent. Leave blank to use the no-reply
            address ({NO_REPLY_EMAIL}).
          </p>
          <div className="flex gap-2 items-stretch max-w-prose">
            <Input
              id="newsletterReplyTo"
              className="input-with-border w-full text-primary"
              type="email"
              value={replyToValue}
              placeholder={NO_REPLY_EMAIL}
              onChange={(e) => setReplyToValue(e.currentTarget.value)}
            />
            {replyToDirty ? (
              <ButtonSecondary
                disabled={savingReplyTo}
                onClick={async () => {
                  if (savingReplyTo) return;
                  let trimmed = replyToValue.trim();
                  setSavingReplyTo(true);
                  if (trimmed === "") {
                    let res = await clearReplyToEmail(props.publicationUri);
                    setSavingReplyTo(false);
                    if (!res.ok) {
                      toaster({
                        type: "error",
                        content: "Failed to clear reply-to.",
                      });
                      return;
                    }
                    toaster({
                      type: "success",
                      content: "Reply-to cleared. Using no-reply address.",
                    });
                    await props.mutate();
                    return;
                  }
                  let res = await setReplyToEmail(
                    props.publicationUri,
                    trimmed,
                  );
                  setSavingReplyTo(false);
                  if (!res.ok) {
                    toaster({
                      type: "error",
                      content:
                        res.error === "invalid_email"
                          ? "Please enter a valid email address."
                          : res.error === "email_send_failed"
                            ? "We couldn't send the confirmation email."
                            : "Something went wrong. Try again.",
                    });
                    return;
                  }
                  if (res.value.verification_required) {
                    setVerifyOpen(true);
                    toaster({
                      type: "success",
                      content: "Confirmation code sent.",
                    });
                  } else {
                    toaster({
                      type: "success",
                      content: "Reply-to saved.",
                    });
                  }
                  await props.mutate();
                }}
              >
                {savingReplyTo ? <DotLoader /> : "Save"}
              </ButtonSecondary>
            ) : pendingVerification ? (
              <ButtonSecondary onClick={() => setVerifyOpen(true)}>
                Verify
              </ButtonSecondary>
            ) : null}
          </div>
          {pendingVerification && !replyToDirty && (
            <p className="text-tertiary text-sm leading-snug">
              Pending verification. Until confirmed, the no-reply address is
              used.
            </p>
          )}
        </div>
      </div>

      <Modal
        open={verifyOpen}
        onOpenChange={setVerifyOpen}
        title="Confirm reply-to address"
        className="max-w-full w-sm"
      >
        <EmailConfirm
          emailValue={props.settings?.reply_to_email ?? ""}
          autoFocus
          loading={confirming}
          onSubmit={async (code) => {
            if (confirming) return;
            setConfirming(true);
            let res = await confirmReplyToVerification(
              props.publicationUri,
              code,
            );
            setConfirming(false);
            if (!res.ok) {
              toaster({
                type: "error",
                content:
                  res.error === "invalid_code"
                    ? "That code didn't match. Try again."
                    : res.error === "no_pending_verification"
                      ? "No pending verification."
                      : "Something went wrong. Try again.",
              });
              return;
            }
            toaster({ type: "success", content: "Reply-to verified." });
            setVerifyOpen(false);
            await props.mutate();
          }}
          onBack={() => setVerifyOpen(false)}
        />
      </Modal>
    </SettingsSection>
  );
}

const EmbedFormSnippet = (props: {
  publicationUri: string;
  publicationUrl?: string;
}) => {
  let toaster = useToaster();
  let appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://leaflet.pub";
  let actionUrl = `${appUrl.replace(/\/$/, "")}/api/auth/email-login`;
  let action = encodeActionToSearchParam({
    action: "subscribe",
    publication: props.publicationUri,
  });
  let redirect = props.publicationUrl || appUrl;
  let snippet = `<form action="${actionUrl}" method="get">
  <input type="hidden" name="action" value="${action}" />
  <input type="hidden" name="redirect" value="${redirect}" />
  <input type="email" name="email" placeholder="you@example.com" required />
  <button type="submit">Subscribe</button>
</form>`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <p className="text-tertiary text-sm leading-snug">
          Paste this HTML into any webpage to let readers subscribe to your
          publication. After submitting, they&apos;re redirected here to confirm
          with a code we email them.
        </p>
        <div className="relative max-w-prose">
          <pre className="input-with-border bg-border-light text-primary text-sm rounded-md p-2 pr-16 overflow-x-auto whitespace-pre">
            <code>{snippet}</code>
          </pre>
          <ButtonSecondary
            compact
            className="absolute top-1.5 right-1.5 text-xs!"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(snippet);
                toaster({ type: "success", content: "Copied!" });
              } catch {
                toaster({
                  type: "error",
                  content: "Couldn't copy to clipboard.",
                });
              }
            }}
          >
            Copy
          </ButtonSecondary>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-secondary font-bold text-sm">Preview</p>
        <form
          className="opaque-container flex gap-2 items-center p-3 max-w-prose"
          onSubmit={(e) => e.preventDefault()}
        >
          <Input
            className="input-with-border grow min-w-0 text-primary"
            type="email"
            placeholder="you@example.com"
          />
          <ButtonPrimary type="submit">Subscribe</ButtonPrimary>
        </form>
      </div>
    </div>
  );
};
