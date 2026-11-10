"use client";

import { useState, type ReactNode } from "react";
import { ButtonSecondary } from "components/Buttons";
import { Menu, RadioMenuGroup, RadioMenuItem } from "components/Menu";

export function NotificationSettingRow<Frequency extends string>(props: {
  label: string;
  channel?: string;
  value?: Frequency;
  options: Record<Frequency, string>;
  isLoading: boolean;
  disabled?: boolean;
  onChange: (frequency: Frequency) => Promise<void>;
  children?: ReactNode;
}) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  return (
    <tr>
      <th scope="row" className="py-3 pr-4 font-normal">
        {props.channel || "Email"}
      </th>
      <td className="py-3 pr-4">{props.label}</td>
      <td className="py-3">
        <div className="flex items-center gap-2">
          <Menu
            asChild
            trigger={
              <ButtonSecondary
                className="w-32! justify-between!"
                disabled={
                  !props.value || props.isLoading || saving || props.disabled
                }
                aria-label={`${props.label} frequency`}
                aria-busy={saving}
              >
                <span>
                  {props.isLoading
                    ? "Loading…"
                    : props.value
                      ? props.options[props.value]
                      : "Unavailable"}
                </span>
                <span aria-hidden="true">▾</span>
              </ButtonSecondary>
            }
          >
            <RadioMenuGroup
              value={props.value || "off"}
              onValueChange={async (value) => {
                if (saving || !Object.hasOwn(props.options, value)) return;
                setSaving(true);
                setSaveError(false);
                try {
                  await props.onChange(value as Frequency);
                } catch {
                  setSaveError(true);
                } finally {
                  setSaving(false);
                }
              }}
            >
              {Object.entries<string>(props.options).map(([value, label]) => (
                <RadioMenuItem
                  key={value}
                  value={value}
                  selected={props.value === value}
                >
                  {label}
                </RadioMenuItem>
              ))}
            </RadioMenuGroup>
          </Menu>
          {props.children}
        </div>
        {saveError && (
          <p role="alert">Couldn’t save your preference. Please try again.</p>
        )}
      </td>
    </tr>
  );
}
