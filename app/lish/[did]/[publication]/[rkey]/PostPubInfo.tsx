import { SubscribeButton } from "components/Subscribe/SubscribeButton";

export const PostPubInfo = () => {
  let newsletterMode = true;
  let user = {
    loggedIn: false,
    email: undefined,
    handle: undefined,
    subscribed: false,
  };
  return (
    <div className="px-3 sm:px-4 w-full">
      <div className="accent-container rounded-lg! w-full px-3 pt-3 pb-4 sm:px-4 sm:pt-4 sm:pb-5 text-center justify-center">
        <h3 className="leading-snug text-secondary">Pub Title here</h3>
        <div className="text-tertiary pb-3">this is the pubs description</div>
        {user.subscribed ? (
          <div>Manage Sub</div>
        ) : (
          <SubscribeButton newsletterMode={newsletterMode} user={user} />
        )}
      </div>
    </div>
  );
};
