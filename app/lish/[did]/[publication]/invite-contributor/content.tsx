import { PubLeafletPublication } from "lexicons/api";
import { ButtonPrimary } from "components/Buttons";
import { PubIcon } from "components/ActionBar/Publications";
import { SpeedyLink } from "components/SpeedyLink";
import { BlueskyLogin } from "app/login/LoginForm";

export const InvitedContent = (props: {
  pubRecord: PubLeafletPublication.Record;
  uri: string | undefined;
  href: string;
}) => {
  return (
    <>
      <h2>Become a Contributor!</h2>
      <PubLink {...props} />
      <div>
        You've been invited to write for <br />
        {props.pubRecord.name}!{" "}
      </div>
      <ButtonPrimary className="mx-auto mt-4 mb-2">Accept Invite</ButtonPrimary>
    </>
  );
};

export const NotInvitedContent = (props: {
  pubRecord: PubLeafletPublication.Record;
  uri: string | undefined;
  href: string;
}) => {
  return (
    <>
      <h3 className="pb-2">You haven't been invited to contribute yet...</h3>
      <PubLink {...props} />

      <div>
        If you are expecting an invite, please check that the owner of this
        publication added you to the invited contributors list.
      </div>
    </>
  );
};

export const LoggedOutContent = (props: {
  pubRecord: PubLeafletPublication.Record;
  uri: string | undefined;
  href: string;
}) => {
  return (
    <>
      <h2>Log in to Contribute</h2>
      <PubLink {...props} />
      <div className="pb-2">
        Log in with an AT Proto handle to contribute this publication
      </div>
      <BlueskyLogin redirectRoute={`${props.href}/invite-contributor`} />
    </>
  );
};

const PubLink = (props: {
  pubRecord: PubLeafletPublication.Record;
  uri: string | undefined;
  href: string;
}) => {
  return (
    <SpeedyLink
      href={props.href}
      className="p-4  flex flex-col justify-center text-center border border-border rounded-lg mt-2 mb-4 hover:no-underline! no-underline!"
    >
      <PubIcon
        large
        record={props.pubRecord}
        uri={props.uri}
        className="mx-auto mb-3 mt-1"
      />
      <h3 className="leading-tight">{props.pubRecord.name}</h3>
      <div className="text-tertiary italic">{props.pubRecord.description}</div>
    </SpeedyLink>
  );
};
