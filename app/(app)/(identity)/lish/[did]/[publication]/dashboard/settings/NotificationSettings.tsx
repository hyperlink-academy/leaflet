"use client";

import useSWR from "swr";
import { useState } from "react";
import {
  getNotificationPreferences,
  setNotificationPreference,
} from "actions/publications/notificationSettings";
import { ButtonSecondary } from "components/Buttons";
import { SettingsSection } from "components/SettingsLayout";
import { usePublicationData } from "../PublicationSWRProvider";
import { useIdentityData } from "components/IdentityProvider";
import { isDevMode } from "src/utils/isDevMode";
import { sendTestDigest } from "actions/publications/sendTestDigest";
import { NotificationSettingRow } from "./NotificationSettingRow";
import type { NotificationPreference } from "src/notificationPreferences";
import { digestLabels as labels } from "src/digests/frequencies";

export function NotificationSettings() {
  const { data: publicationData } = usePublicationData();
  const { identity } = useIdentityData();
  const publication = publicationData?.publication?.uri;
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

  async function savePreference(preference: NotificationPreference) {
    if (!publication) throw new Error("Publication unavailable");
    const result = await setNotificationPreference(publication, preference);
    if (!result.ok) throw new Error(result.error);
    await mutate(
      (current) =>
        current
          ? { ...current, [preference.type]: preference.frequency }
          : current,
      { revalidate: false },
    );
  }

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
          <NotificationSettingRow
            label="Email digest"
            value={data?.digest}
            options={labels}
            isLoading={isLoading}
            disabled={!!error}
            onChange={(frequency) =>
              savePreference({ type: "digest", frequency })
            }
          >
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
                      setTestStatus(`Test digest sent to ${identity?.email}.`);
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
          </NotificationSettingRow>
          <NotificationSettingRow
            label="Comments"
            value={data?.comments}
            options={{ off: "Off", instant: "Instant" }}
            isLoading={isLoading}
            disabled={!!error}
            onChange={(frequency) =>
              savePreference({ type: "comments", frequency })
            }
          />
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
      {testStatus && <p role={testError ? "alert" : "status"}>{testStatus}</p>}
      <p className="text-sm text-tertiary">
        Digests are only sent when there is new activity.
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
