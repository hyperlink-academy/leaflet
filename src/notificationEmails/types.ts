// Add future notification kinds here together with their sender in the dispatcher.
export type NotificationEmailRequest = {
  type: "comments";
  subjectUri: string;
};
