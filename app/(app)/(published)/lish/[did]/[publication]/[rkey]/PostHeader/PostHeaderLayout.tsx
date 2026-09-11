export const PostHeaderLayout = (props: {
  pubLink: React.ReactNode;
  postTitle: React.ReactNode | undefined;
  postDescription: React.ReactNode | undefined;
  postInfo: React.ReactNode;
}) => {
  return (
    <header
      className="postHeader w-full flex flex-col px-3 sm:px-4 sm:pt-3 pt-2 pb-5"
      id="post-header"
    >
      <div className="pubInfo relative flex text-accent-contrast font-bold justify-between w-full">
        {props.pubLink}
      </div>
      {props.postTitle && (
        <h1 className="postTitle text-2xl leading-tight pt-0.5 font-bold outline-hidden bg-transparent">
          {props.postTitle}
        </h1>
      )}
      {props.postDescription ? (
        <div className="postDescription italic text-secondary outline-hidden bg-transparent pt-2">
          {props.postDescription}
        </div>
      ) : null}
      <div className="postInfo text-sm text-tertiary pt-3 flex gap-1 flex-wrap justify-between">
        {props.postInfo}
      </div>
    </header>
  );
};
