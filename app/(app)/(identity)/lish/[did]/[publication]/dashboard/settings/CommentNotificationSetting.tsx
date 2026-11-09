"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  getNotificationPreferences,
  setNotificationPreference,
} from "actions/publications/notificationSettings";
import { ButtonSecondary } from "components/Buttons";
import { Menu, RadioMenuGroup, RadioMenuItem } from "components/Menu";

export function CommentNotificationSetting(props: {
  identity: string;
  publication: string;
}) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const { data, error, isLoading, mutate } = useSWR(
    ["notification-preferences", props.identity, props.publication],
    async ([, , publication]) => {
      const result = await getNotificationPreferences(publication);
      if (!result.ok) throw new Error(result.error);
      return result.value;
    },
  );
  return (
    <tr>
      <th scope="row" className="py-3 pr-4 font-normal">
        Email
      </th>
      <td className="py-3 pr-4">Comments</td>
      <td className="py-3">
        <Menu
          asChild
          trigger={
            <ButtonSecondary
              className="w-32! justify-between!"
              disabled={!data || isLoading || saving || !!error}
              aria-label="Comment notification frequency"
              aria-busy={saving}
            >
              <span>
                {isLoading
                  ? "Loading…"
                  : data?.comments === "instant"
                    ? "Instant"
                    : data?.comments === "off"
                      ? "Off"
                      : "Unavailable"}
              </span>
              <span aria-hidden="true">▾</span>
            </ButtonSecondary>
          }
        >
          <RadioMenuGroup
            value={data?.comments || "off"}
            onValueChange={async (value) => {
              if (saving || (value !== "off" && value !== "instant")) return;
              setSaving(true);
              setSaveError(false);
              try {
                const result = await setNotificationPreference(
                  props.publication,
                  { type: "comments", frequency: value },
                );
                if (!result.ok) throw new Error(result.error);
                await mutate(
                  (current) =>
                    current ? { ...current, comments: value } : current,
                  { revalidate: false },
                );
              } catch {
                setSaveError(true);
              } finally {
                setSaving(false);
              }
            }}
          >
            <RadioMenuItem value="off" selected={data?.comments === "off"}>
              Off
            </RadioMenuItem>
            <RadioMenuItem
              value="instant"
              selected={data?.comments === "instant"}
            >
              Instant
            </RadioMenuItem>
          </RadioMenuGroup>
        </Menu>
        {error && (
          <p role="alert">
            Couldn’t load preferences.{" "}
            <button className="underline" onClick={() => void mutate()}>
              Try again
            </button>
          </p>
        )}
        {saveError && (
          <p role="alert">Couldn’t save your preference. Please try again.</p>
        )}
      </td>
    </tr>
  );
}
