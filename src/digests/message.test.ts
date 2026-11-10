import { describe, expect, it } from "vitest";
import { digestMessage } from "./message";

const activity = {
  subscribers: 2,
  likes: 3,
  comments: 4,
  mentions: 1,
  post_questions: 0,
  quotes: 5,
};

describe("branded digest email", () => {
  it("renders Leaflet branding, shared fonts, and all six activity counts", async () => {
    const message = await digestMessage("Jinny thoughts", activity, null);
    expect(message.html).toContain(
      "https://leaflet.pub/email-assets/leaflet.png",
    );
    expect(message.html).toContain('alt="Leaflet"');
    expect(message.html).toContain("Georgia");
    expect(message.html).toContain("Verdana");
    expect(message.html).toContain('aria-label="New publication activity"');
    for (const label of [
      "Subscribers",
      "Likes",
      "Comments",
      "Mentions",
      "Post questions",
      "Quotes",
    ]) {
      expect(message.html).toContain(label);
      expect(message.text).toContain(`${label}: +`);
    }
    expect(message.html).not.toContain('rel="preload"');
  });

  it("shows the reporting timestamp once in each email body", async () => {
    const message = await digestMessage(
      "Jinny thoughts",
      activity,
      "2026-11-10T16:33:40.000Z",
    );
    expect(message.html.split("16:33:40")).toHaveLength(2);
    expect(message.text.split("16:33:40")).toHaveLength(2);
    expect(message.text).toContain("Subscribers: +2\nLikes: +3");
  });

  it("escapes publication names and distinguishes scheduled mail from tests", async () => {
    const message = await digestMessage(
      '<script>alert("x")</script>',
      activity,
      null,
      false,
    );
    expect(message.html).not.toContain('<script>alert("x")</script>');
    expect(message.html).toContain("&lt;script&gt;");
    expect(message.html).toContain("You opted into email digests");
    expect(message.text).not.toContain("test digest");
  });
});
