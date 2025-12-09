import { CommentTiny } from "components/Icons/CommentTiny";
import { Activity } from "./Activity";

export const CommentActivty = () => {
  return (
    <Activity
      icon={<CommentTiny />}
      activity={"celine commented"}
      content={<div>hello</div>}
    />
  );
};
