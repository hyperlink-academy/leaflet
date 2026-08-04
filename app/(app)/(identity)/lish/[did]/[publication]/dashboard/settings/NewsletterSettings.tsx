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
import { InputSetting, SettingsSection } from "components/SettingsLayout";
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
      {!newsletterEnabled && (
        <EnableNewsletterSection
          publicationUri={publicationUri}
          mutate={mutate}
        />
      )}
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
      {newsletterEnabled && (
        <DisableNewsletterSection
          publicationUri={publicationUri}
          mutate={mutate}
        />
      )}
    </>
  );
};

function EnableNewsletterSection(props: {
  publicationUri: string;
  mutate: ReturnType<typeof usePublicationData>["mutate"];
}) {
  let toaster = useToaster();
  let [pending, setPending] = useState(false);

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

function DisableNewsletterSection(props: {
  publicationUri: string;
  mutate: ReturnType<typeof usePublicationData>["mutate"];
}) {
  let toaster = useToaster();
  let [pending, setPending] = useState(false);

  return (
    <SettingsSection title="Disable Newsletter">
      <div className="flex flex-col gap-3 flex-wrap">
        <div className="text-secondary leading-snug">
          Disabling newsletter mode will stop sending emails to subscribers. You
          will keep the emails and can re-enable at any time.
        </div>
        <div className="text-secondary leading-snug">
          We will NOT send an automatic email notifying subscribers, so be sure
          to send a notice before you disable!
        </div>
      </div>

      <ButtonSecondary
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
        {pending ? <DotLoader /> : "Disable"}
      </ButtonSecondary>
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
    <SettingsSection title="Newsletter Options">
      Newsletters allows your subscribers to opt into email updates. <br />
      Configure the email your subscribers recieve here!
      <div className="flex flex-col gap-4">
        <InputSetting label="Sender Name">
          <div className="light-container w-full max-w-prose text-secondary h-fit bg-border-light px-2 py-1 rounded-md">
            {props.fromName || "—"}
          </div>
        </InputSetting>
        <InputSetting label="Sender Email">
          <div className="light-container w-full max-w-prose text-secondary h-fit bg-border-light px-2 py-1 rounded-md">
            {fromAddress || "—"}
          </div>
        </InputSetting>

        <InputSetting
          htmlFor="newsletterReplyTo"
          optional
          label="Reply-to Email"
          helpText={
            pendingVerification && !replyToDirty ? (
              <>
                <strong>Pending verification.</strong> Until confirmed, the
                no-reply address is used.
              </>
            ) : (
              `Where subscriber replies are sent. Leave blank to use a no-reply
          address`
            )
          }
        >
          <div className="relative">
            <Input
              id="newsletterReplyTo"
              className="input-with-border w-full text-primary"
              type="email"
              value={replyToValue}
              placeholder={NO_REPLY_EMAIL}
              onChange={(e) => setReplyToValue(e.currentTarget.value)}
            />
            <div className="absolute top-[4px] right-1">
              <ReplyToButton
                publicationUri={props.publicationUri}
                replyToValue={replyToValue}
                dirty={replyToDirty}
                pendingVerification={pendingVerification}
                openVerify={() => setVerifyOpen(true)}
                mutate={props.mutate}
              />
            </div>
          </div>
        </InputSetting>
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

// Saves the reply-to address (or clears it when blank). Once saved, an
// unverified address swaps this for the button that reopens the code modal.
function ReplyToButton(props: {
  publicationUri: string;
  replyToValue: string;
  dirty: boolean;
  pendingVerification: boolean;
  openVerify: () => void;
  mutate: ReturnType<typeof usePublicationData>["mutate"];
}) {
  let toaster = useToaster();
  let [saving, setSaving] = useState(false);

  if (!props.dirty)
    return props.pendingVerification ? (
      <ButtonPrimary compact onClick={props.openVerify} className="text-sm">
        Verify
      </ButtonPrimary>
    ) : null;

  return (
    <ButtonPrimary
      className="text-sm"
      compact
      disabled={saving}
      onClick={async () => {
        if (saving) return;
        let trimmed = props.replyToValue.trim();
        setSaving(true);
        if (trimmed === "") {
          let res = await clearReplyToEmail(props.publicationUri);
          setSaving(false);
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
        let res = await setReplyToEmail(props.publicationUri, trimmed);
        setSaving(false);
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
          props.openVerify();
          toaster({ type: "success", content: "Confirmation code sent." });
        } else {
          toaster({ type: "success", content: "Reply-to saved." });
        }
        await props.mutate();
      }}
    >
      {saving ? <DotLoader /> : "Save"}
    </ButtonPrimary>
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
    <>
      <p className="text-secondary leading-snug">
        Paste this HTML into any webpage to let readers subscribe to your
        publication directly from there.
      </p>
      <p className="text-secondary leading-snug">
        After submitting, they&apos;re sent to Leaflet to confirm thier email,
        then sent back to your webpage.
      </p>
      <InputSetting label="HTML Snippet">
        <div className="flex flex-col">
          <pre className="input-with-border bg-border-light text-primary text-sm rounded-md p-2 pr-16 overflow-x-auto whitespace-pre">
            <code>{snippet}</code>
          </pre>
          <ButtonSecondary
            type="button"
            compact
            fullWidth
            className="mt-2"
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
            Copy HTML
          </ButtonSecondary>
        </div>
      </InputSetting>
      <InputSetting label="Preview">
        <form
          className="light-container flex gap-2 items-center p-3 max-w-prose"
          onSubmit={(e) => e.preventDefault()}
        >
          <Input
            className="input-with-border grow min-w-0 text-primary"
            type="email"
            placeholder="you@example.com"
          />
          <ButtonPrimary type="submit">Subscribe</ButtonPrimary>
        </form>
      </InputSetting>
    </>
  );
};
