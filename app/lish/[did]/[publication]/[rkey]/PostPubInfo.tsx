import { SubscribeInput } from "components/Subscribe/SubscribeButton";

export const dummy = {
  newsletterMode: false,
  user: {
    loggedIn: false,
    email: "thisiscelinepark@gmail.com",
    handle: undefined,
    subscribed: false,
  },
};

export const PostPubInfo = (props: {
  autoFocus?: boolean;
  newsletterMode: boolean;
  user: {
    loggedIn: boolean;
    email: string | undefined;
    handle: string | undefined;
    subscribed: boolean;
  };
}) => {
  return (
    <div className="px-3 sm:px-4 w-full">
      <div className="accent-container rounded-lg! w-full px-3 pt-3 pb-4 sm:px-4 sm:pt-4 sm:pb-5 text-center justify-center">
        <h3 className="leading-snug text-secondary">Pub Title here</h3>
        <div className="text-tertiary pb-3">this is the pubs description</div>

        <div className="max-w-sm mx-auto ">
          <SubscribeInput
            autoFocus={props.autoFocus}
            newsletterMode={props.newsletterMode}
            user={props.user}
          />
        </div>
      </div>
    </div>
  );
};
