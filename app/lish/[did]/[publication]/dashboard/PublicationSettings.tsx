import { SettingSectionButton } from "app/home/HomeSettings";
import { useState } from "react";

export const PublicationSettings = () => {
  let [settingsState, setSettingsState] = useState<
    "default" | "general" | "theme"
  >("default");
  if (settingsState === "default")
    return (
      <div className="flex gap-2">
        <SettingSectionButton
          setting="general"
          setSettingsState={setSettingsState}
          label="General"
        />
        <SettingSectionButton
          setting="theme"
          setSettingsState={setSettingsState}
          label="Theme"
        />
      </div>
    );
  if (settingsState === "general") return <div>general</div>;
  if (settingsState === "theme") return <div>theme</div>;
};
