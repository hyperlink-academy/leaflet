"use client";
import { SettingsSection } from "components/SettingsLayout";
import { AccountEmailForm } from "components/AccountEmailForm";
import { DomainTab } from "./domains/DomainTab";

export function GeneralTab() {
  return (
    <>
      <SettingsSection title="Account">
        <AccountEmailForm />
      </SettingsSection>
      <DomainTab />
    </>
  );
}
