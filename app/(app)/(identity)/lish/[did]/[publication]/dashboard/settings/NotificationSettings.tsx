"use client";

import useSWR from "swr";
import { useState } from "react";
import {
  getNotificationPreference,
  setNotificationPreference,
} from "actions/publications/notificationSettings";
import { ButtonSecondary } from "components/Buttons";
import { Menu, RadioMenuGroup, RadioMenuItem } from "components/Menu";
import { SettingsSection } from "components/SettingsLayout";
import { usePublicationData } from "../PublicationSWRProvider";
import { useIdentityData } from "components/IdentityProvider";
import { isDevMode } from "src/utils/isDevMode";

const labels = { off: "Off", daily: "Daily", weekly: "Weekly" };

export function NotificationSettings() {
  const { data: publicationData } = usePublicationData();
  const { identity } = useIdentityData();
  const publication = publicationData?.publication?.uri;
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const { data, error, isLoading, mutate } = useSWR(
    publication && identity
      ? ["notification-preference", identity.id, publication]
      : null,
    async ([, , uri]) => {
      const result = await getNotificationPreference(uri);
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
                            ? labels[data]
                            : "Unavailable"}
                      </span>
                      <span aria-hidden="true">▾</span>
                    </ButtonSecondary>
                  }
                >
                  <RadioMenuGroup
                    value={data || "off"}
                    onValueChange={async (value) => {
                      if (!publication || saving || !(value in labels)) return;
                      setSaving(true);
                      setSaveError(false);
                      try {
                        const frequency = value as keyof typeof labels;
                        const result = await setNotificationPreference(
                          publication,
                          frequency,
                        );
                        if (!result.ok) throw new Error(result.error);
                        await mutate(frequency, { revalidate: false });
                      } catch {
                        setSaveError(true);
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    {Object.entries(labels).map(([value, label]) => (
                      <RadioMenuItem
                        key={value}
                        value={value}
                        selected={data === value}
                      >
                        {label}
                      </RadioMenuItem>
                    ))}
                  </RadioMenuGroup>
                </Menu>
                {isDevMode(identity) && (
                  <ButtonSecondary
                    disabled
                    title="Available once digest delivery is connected."
                  >
                    Send test
                  </ButtonSecondary>
                )}
              </div>
            </td>
          </tr>
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
      {saveError && (
        <p role="alert">Couldn’t save your preference. Please try again.</p>
      )}
      <p className="text-sm text-tertiary">
        Digest delivery is not available yet. These settings save your
        preference for when it becomes available.
      </p>
    </SettingsSection>
  );
}
