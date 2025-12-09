import { profileTabsType } from "../ProfilePageLayout";

export const ProfileTabs = (props: {
  tab: profileTabsType;
  setTab: (t: profileTabsType) => void;
}) => {
  let buttonStyle = "text-secondary";
  return (
    <div className="flex flex-col w-full">
      <div className="flex gap-2 justify-between">
        <div className="flex gap-2">
          <button
            className={buttonStyle}
            onClick={() => {
              props.setTab("activity");
            }}
          >
            Activity
          </button>
          <button
            className={buttonStyle}
            onClick={() => {
              props.setTab("posts");
            }}
          >
            Posts
          </button>
          <button
            className={buttonStyle}
            onClick={() => {
              props.setTab("comments");
            }}
          >
            Comments
          </button>
        </div>
        <button
          className={buttonStyle}
          onClick={() => {
            props.setTab("subscriptions");
          }}
        >
          Subscriptions
        </button>
      </div>
      <hr className="border-border-light mb-2 mt-1" />
    </div>
  );
};

export const TabContent = (props: { tab: profileTabsType }) => {
  switch (props.tab) {
    case "activity":
      return <div>activty stuff here!</div>;
    case "posts":
      return <div>posts here!</div>;
    case "comments":
      return <div>comments here!</div>;
    case "subscriptions":
      return <div>subscriptions here!</div>;
  }
};
