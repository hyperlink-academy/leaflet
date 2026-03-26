import { SubscribeWithHandle } from "./HandleSubscribe";
import { EmailSubscribe } from "./EmailSubscribe";
import { Modal } from "components/Modal";
import { ButtonPrimary } from "components/Buttons";
import { PostPubInfo } from "app/lish/[did]/[publication]/[rkey]/PostPubInfo";
import { ManageSubscription } from "./ManageSubscribe";

export const SubscribeButton = (props: {
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
    <Modal
      className="px-0! py-3! sm:py-4! w-[1000px] sm:max-w-md max-w-full"
      asChild
      trigger={
        props.user.subscribed ? (
          <ManageSubscription {...props} />
        ) : (
          <ButtonPrimary compact className="text-sm">
            Subscribe
          </ButtonPrimary>
        )
      }
    >
      <PostPubInfo autoFocus {...props} />
    </Modal>
  );
};

export const SubscribeInput = (props: {
  autoFocus?: boolean;
  newsletterMode: boolean;
  user: {
    loggedIn: boolean;
    email: string | undefined;
    handle: string | undefined;
    subscribed: boolean;
  };
}) => {
  if (props.user.subscribed) {
    return <ManageSubscription {...props} />;
  }
  if (props.newsletterMode) {
    return <EmailSubscribe user={props.user} autoFocus={props.autoFocus} />;
  } else
    return (
      <SubscribeWithHandle user={props.user} autoFocus={props.autoFocus} />
    );
};
