import { Tab } from "components/Tab";
import { profileTabsType } from "../ProfilePageLayout";

export const ProfileTabs = (props: {
  tab: profileTabsType;
  setTab: (t: profileTabsType) => void;
}) => {
  return (
    <div className="flex flex-col w-full">
      <div className="flex gap-2 justify-between">
        <div className="flex gap-2">
          <Tab
            name="Posts"
            selected={props.tab === "posts"}
            onSelect={() => {
              props.setTab("posts");
            }}
          />
          <Tab
            name="Comments"
            selected={props.tab === "comments"}
            onSelect={() => {
              props.setTab("comments");
            }}
          />
        </div>
        <Tab
          name="Subscriptions"
          selected={props.tab === "subscriptions"}
          onSelect={() => {
            props.setTab("subscriptions");
          }}
        />
      </div>
      <hr className="border-border-light mb-2 mt-1" />
    </div>
  );
};

export const TabContent = (props: { tab: profileTabsType }) => {
  switch (props.tab) {
    case "posts":
      return <div>posts here!</div>;
    case "comments":
      return <div>comments here!</div>;
    case "subscriptions":
      return <div>subscriptions here!</div>;
  }
};
