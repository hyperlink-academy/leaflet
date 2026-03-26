import { ButtonSecondary } from "components/Buttons";
import { CheckTiny } from "components/Icons/CheckTiny";
import { GoToArrow } from "components/Icons/GoToArrow";
import { Modal } from "components/Modal";
import { LinkHandle } from "./HandleSubscribe";
import { EmailSubscribe } from "./EmailSubscribe";

export const ManageSubscription = (props: {
  newsletterMode: boolean;
  user: {
    loggedIn: boolean;
    email: string | undefined;
    handle: string | undefined;
    subscribed: boolean;
  };
}) => {
  let prefClassName =
    "flex gap-2 justify-between font-bold text-secondary items-center";
  return (
    <Modal
      title="Preferences"
      className="w-md max-w-full"
      trigger={
        <div className="manageSubPrefsTrigger flex gap-1 text-accent-contrast text-sm items-center ">
          <div className="font-bold flex gap-1 items-center">
            <CheckTiny /> Subscribed
          </div>
          <div className="underline">Manage</div>
        </div>
      }
    >
      <div className="manageSubPrefs flex flex-col gap-2">
        {props.newsletterMode && props.user.email ? (
          <div className={prefClassName}>
            <div className="flex flex-col leading-snug">
              <p>Linked Email</p>
              <p className="text-tertiary font-normal italic">
                {props.user.email}
              </p>
            </div>
          </div>
        ) : null}
        {props.user.handle && (
          <div className={prefClassName}>
            <div className="flex flex-col leading-snug">
              Linked Handle {props.user.handle}
            </div>
          </div>
        )}
        <div className={prefClassName}>
          Get RSS Feed <GoToArrow className="text-accent-contrast" />
        </div>
        <div className={prefClassName}>
          Pin Custom Bluesky Feed
          <GoToArrow className="text-accent-contrast" />
        </div>

        {props.newsletterMode && !props.user.email ? (
          <div className="linkEmail accent-container p-4 text-sm flex flex-col gap-3 text-center justify-center">
            <div
              className={`text-secondary flex flex-col text-sm leading-snug`}
            >
              <h4 className={"text-sm"}>Link your email</h4>
              <div className="text-tertiary">
                to get updates right to your inbox!
              </div>
            </div>
            <EmailSubscribe link {...props} />
          </div>
        ) : null}
        {!props.user.handle ? (
          <div className="accent-container p-4 text-sm">
            <LinkHandle compact />
          </div>
        ) : null}

        <hr className="border-border-light my-2" />
        <ButtonSecondary fullWidth>Unsubscribe</ButtonSecondary>
      </div>
    </Modal>
  );
};
