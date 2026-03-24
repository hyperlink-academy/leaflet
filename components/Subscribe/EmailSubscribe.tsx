import { ButtonPrimary } from "components/Buttons";
import { GoToArrow } from "components/Icons/GoToArrow";
import { Input } from "components/Input";
import { Modal } from "components/Modal";
import { useState } from "react";
import { HandleInput, UniversalHandleInfo } from "./AtSubscribe";

export const EmailSubscribe = (props: {
  compact?: boolean;
  user: {
    loggedIn: boolean;
    email: string | undefined;
    handle: string | undefined;
  };
}) => {
  let [value, setValue] = useState(
    props.user.loggedIn && props.user.email ? props.user.email : "",
  );

  return (
    <div className="relative input-with-border flex gap-2 w-fit mx-auto">
      <Input
        className={`appearance-none! outline-none! max-w-full ${props.compact ? "pr-6" : "pr-14"} `}
        disabled={props.user.loggedIn}
        placeholder="email@example.com"
        size={30}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Modal
        asChild
        trigger={
          props.compact ? (
            <button className="absolute text-sm py-0! right-[3px] top-[3.5px] leading-snug outline-none!">
              <GoToArrow />
            </button>
          ) : (
            <ButtonPrimary
              compact
              className="absolute text-sm py-0! right-[3px] top-[3.5px] leading-snug outline-none!"
            >
              Subscribe
            </ButtonPrimary>
          )
        }
      >
        {props.user.email ? (
          <EmailSubscribeSuccess
            email={props.user.email}
            handle={props.user.handle}
          />
        ) : (
          <EmailSubscribeConfirm emailInputValue={value} />
        )}
      </Modal>
    </div>
  );
};

const EmailSubscribeConfirm = (props: { emailInputValue: string }) => {
  return (
    <div>
      <h3>Confirm your email</h3>
      We sent a confirmation link to <br />
      <span className="italic">{props.emailInputValue}</span>
    </div>
  );
};

const EmailSubscribeSuccess = (props: {
  email: string;
  handle: string | undefined;
}) => {
  return (
    <div className="flex flex-col text-center justify-center p-4 text-secondary max-w-md">
      <h2 className="text-primary pb-1">You've Subscribed!</h2>
      You'll recieve new posts to <br />
      <span className="italic">{props.email}</span>
      {!props.handle && (
        <>
          <hr className="my-4 border-border-light" />
          <div className="flex flex-col gap-4">
            <div className="flex flex-col">
              <h4>Link your universal handle</h4>
              <div>
                to comment, recommend, and see what your friends are reading
              </div>
            </div>
            <UniversalHandleInfo />
            <HandleInput />
          </div>
        </>
      )}
    </div>
  );
};
