import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NotificationEmailRequest } from "./types";

const { sendCommentEmails } = vi.hoisted(() => ({
  sendCommentEmails: vi.fn(),
}));
vi.mock("./comments", () => ({ sendCommentEmails }));
import { sendNotificationEmails } from "./sendNotificationEmails";

beforeEach(() => {
  vi.clearAllMocks();
});
describe("sendNotificationEmails", () => {
  it("routes comment emails to the comment sender", async () => {
    sendCommentEmails.mockResolvedValue({ sent: 1 });
    expect(
      await sendNotificationEmails({
        type: "comments",
        subjectUri: "comment-uri",
      }),
    ).toEqual({ sent: 1 });
    expect(sendCommentEmails).toHaveBeenCalledWith("comment-uri");
  });
  it("rejects notification types without an implemented sender", async () => {
    await expect(
      sendNotificationEmails({
        type: "subscriptions",
        subjectUri: "subscription-uri",
      } as unknown as NotificationEmailRequest),
    ).rejects.toThrow("Unsupported notification email type");
    expect(sendCommentEmails).not.toHaveBeenCalled();
  });
});
