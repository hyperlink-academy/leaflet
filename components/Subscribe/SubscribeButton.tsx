import { HandleSubscribe } from "./HandleSubscribe";
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
  } else return <HandleSubscribe user={props.user} />;
};
