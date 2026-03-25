import { SubscribeButton } from "components/Subscribe/SubscribeButton";

export const dummy = {
  newsletterMode: true,
  user: {
    loggedIn: false,
    email: undefined,
    handle: undefined,
    subscribed: true,
  },
};

export const PostPubInfo = () => {
  return (
    <div className="px-3 sm:px-4 w-full">
      <div className="accent-container rounded-lg! w-full px-3 pt-3 pb-4 sm:px-4 sm:pt-4 sm:pb-5 text-center justify-center">
        <h3 className="leading-snug text-secondary">Pub Title here</h3>
        <div className="text-tertiary pb-3">this is the pubs description</div>
        {dummy.user.subscribed ? (
          <div>Manage Sub</div>
        ) : (
          <SubscribeButton
            newsletterMode={dummy.newsletterMode}
            user={dummy.user}
          />
        )}
      </div>
    </div>
  );
};
