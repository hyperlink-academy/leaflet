import { AtSubscribe } from "./AtSubscribe";
import { EmailSubscribe } from "./EmailSubscribe";

export const SubscribeButton = (props: {
  newsletterMode: boolean;
  user: {
    loggedIn: boolean;
    email: string | undefined;
    handle: string | undefined;
  };
}) => {
  if (props.newsletterMode) {
    return <EmailSubscribe user={props.user} />;
  } else return <AtSubscribe user={props.user} compact />;
};
