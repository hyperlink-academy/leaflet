"use client";
export const EmailSubscribeSuccess = (props: {
  email: string | undefined;
  handle: string | undefined;
}) => {
  return (
    <div className="flex flex-col text-center justify-center p-4 text-secondary max-w-md">
      <h2 className="text-primary pb-1">You've Subscribed!</h2>
      You'll recieve new posts to <br />
      <span className="italic">{props.email ? props.email : "your email"}</span>
      {!props.handle && (
        <>
          <hr className="my-4 border-border-light" />
          <HandleLink />
        </>
      )}
    </div>
  );
};
