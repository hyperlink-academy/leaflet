"use client";

import useSWR from "swr";
import { useState } from "react";
import {
  getNotificationPreferences,
  setNotificationPreference,
} from "actions/publications/notificationSettings";
import { ButtonSecondary } from "components/Buttons";
import { Menu, RadioMenuGroup, RadioMenuItem } from "components/Menu";
import { SettingsSection } from "components/SettingsLayout";
import { usePublicationData } from "../PublicationSWRProvider";
import { useIdentityData } from "components/IdentityProvider";
import { isDevMode } from "src/utils/isDevMode";
import { sendTestDigest } from "actions/publications/sendTestDigest";
import { CommentNotificationSetting } from "./CommentNotificationSetting";
import { digestLabels as labels } from "src/digests/frequencies";

export function NotificationSettings() {
  const { data: publicationData } = usePublicationData();
  const { identity } = useIdentityData();
  const publication = publicationData?.publication?.uri;
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testStatus, setTestStatus] = useState("");
  const [testError, setTestError] = useState(false);
  const { data, error, isLoading, mutate } = useSWR(
    publication && identity
      ? ["notification-preferences", identity.id, publication]
      : null,
    async ([, , uri]) => {
      const result = await getNotificationPreferences(uri);
      if (!result.ok) throw new Error(result.error);
      return result.value;
    },
  );

  return (
    <SettingsSection title="Notifications">
      <p>Your notification preferences for this publication.</p>
      <table className="w-full text-left">
        <caption className="sr-only">Email notification preferences</caption>
        <thead>
          <tr className="border-b border-border-light">
            <th scope="col" className="py-2 pr-4">
              Channel
            </th>
            <th scope="col" className="py-2 pr-4">
              Notification
            </th>
            <th scope="col" className="py-2">
              Frequency
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row" className="py-3 pr-4 font-normal">
              Email
            </th>
            <td className="py-3 pr-4">Email digest</td>
            <td className="py-3">
              <div className="flex items-center gap-2">
                <Menu
                  asChild
                  trigger={
                    <ButtonSecondary
                      className="w-32! justify-between!"
                      disabled={!data || isLoading || saving || !!error}
                      aria-label="Email digest frequency"
                      aria-busy={saving}
                    >
                      <span>
                        {isLoading
                          ? "Loading…"
                          : data
                            ? labels[data.digest]
                            : "Unavailable"}
                      </span>
                      <span aria-hidden="true">▾</span>
                    </ButtonSecondary>
                  }
                >
                  <RadioMenuGroup
                    value={data?.digest || "off"}
                    onValueChange={async (value) => {
                      if (!publication || saving || !(value in labels)) return;
                      setSaving(true);
                      setSaveError("");
                      try {
                        const frequency = value as keyof typeof labels;
                        const result = await setNotificationPreference(
                          publication,
                          { type: "digest", frequency },
                        );
                        if (!result.ok) throw new Error(result.error);
                        await mutate(
                          (current) =>
                            current
                              ? { ...current, digest: frequency }
                              : current,
                          { revalidate: false },
                        );
                      } catch (error) {
                        setSaveError(
                          error instanceof Error &&
                            error.message === "schedule_error"
                            ? "Your preference was saved, but delivery couldn’t be scheduled. Please try again."
                            : "Couldn’t save your preference. Please try again.",
                        );
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    {Object.entries(labels).map(([value, label]) => (
                      <RadioMenuItem
                        key={value}
                        value={value}
                        selected={data?.digest === value}
                      >
                        {label}
                      </RadioMenuItem>
                    ))}
                  </RadioMenuGroup>
                </Menu>
                {isDevMode(identity) && (
                  <ButtonSecondary
                    type="button"
                    disabled={sendingTest || !publication}
                    aria-busy={sendingTest}
                    onClick={async () => {
                      if (!publication || sendingTest) return;
                      setSendingTest(true);
                      setTestError(false);
                      setTestStatus("");
                      try {
                        const result = await sendTestDigest(publication);
                        if (result.ok) {
                          setTestStatus(
                            `Test digest sent to ${identity?.email}.`,
                          );
                        } else {
                          setTestError(true);
                          setTestStatus(testErrors[result.error]);
                        }
                      } catch {
                        setTestError(true);
                        setTestStatus(
                          "Couldn’t confirm delivery. Check your inbox before trying again.",
                        );
                      } finally {
                        setSendingTest(false);
                      }
                    }}
                  >
                    Send test
                  </ButtonSecondary>
                )}
              </div>
            </td>
          </tr>
          {publication && identity && (
            <CommentNotificationSetting
              identity={identity.id}
              publication={publication}
            />
          )}
        </tbody>
      </table>
      {error && (
        <p role="alert">
          Couldn’t load your preferences.{" "}
          <button className="underline" onClick={() => void mutate()}>
            Try again
          </button>
        </p>
      )}
      {saveError && <p role="alert">{saveError}</p>}
      {testStatus && <p role={testError ? "alert" : "status"}>{testStatus}</p>}
      <p className="text-sm text-tertiary">
        Digests are only sent when there is new activity.<br />
        Daily digests are scheduled for midnight UTC; weekly digests for Sunday’s end.
      </p>
    </SettingsSection>
  );
}

const testErrors = {
  unauthorized:
    "Test digests are only available to approved publication owners.",
  email_required:
    "Connect an email address in your account settings to receive a test digest.",
  email_not_configured:
    "Email delivery isn’t configured on this server. Set POSTMARK_API_KEY to send a test digest.",
  database_error: "Couldn’t prepare the digest. Please try again.",
  already_sending: "A test digest is already being prepared.",
  delivery_pending:
    "A previous digest is still pending. Check your inbox and delivery status before sending again.",
  delivery_uncertain:
    "Couldn’t confirm delivery. Check your inbox and delivery status before sending again.",
  email_send_failed:
    "The email provider rejected the digest. Check the email configuration before trying again.",
};
