export const Activity = (props: {
  icon: React.ReactNode;
  activity: React.ReactNode;
  content: React.ReactNode;
}) => {
  return (
    <div className="flex flex-col">
      <div className="flex gap-2 items-center text-tertiary font-bold">
        {props.icon} {props.activity}
      </div>
      <div>{props.content}</div>
    </div>
  );
};
