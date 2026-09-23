import { describe, expect, test } from "vitest";
import { assignPublishedAt, planComicPosts } from "./comicsFiles";

describe("planComicPosts", () => {
  test("orders chapters, covers first, then pages by number", () => {
    const plan = planComicPosts([
      "chapter2/ch2_001.jpg",
      "chapter1/ch1_010.jpg",
      "chapter1/ch1_002.jpg",
      "chapter1/chap1-cover.jpg",
      "chapter2/chap2-cover.jpg",
      "chapter1/",
      "chapter1/notes.txt",
      "chapter1/.DS_Store",
    ]);
    expect(plan.map((p) => p.title)).toEqual([
      "Chapter 1 - Cover",
      "Chapter 1 - 002",
      "Chapter 1 - 010",
      "Chapter 2 - Cover",
      "Chapter 2 - 001",
    ]);
    expect(plan[0]).toMatchObject({ chapter: 1, page: null, isCover: true });
    expect(plan[2]).toMatchObject({ chapter: 1, page: 10, isCover: false });
  });

  test("falls back to the file name for the chapter", () => {
    expect(planComicPosts(["ch12_003.png"])[0].chapter).toBe(12);
  });

  test("rejects files it can't place", () => {
    expect(() => planComicPosts(["chapter1/bonus.jpg"])).toThrow(
      /neither a page number nor "cover"/,
    );
    expect(() => planComicPosts(["misc/007.jpg"])).toThrow(/which chapter/);
  });
});

test("assignPublishedAt spaces posts a minute apart ending at the given time", () => {
  const end = new Date("2026-09-23T12:00:00.000Z");
  const dated = assignPublishedAt([{ t: "a" }, { t: "b" }, { t: "c" }], end);
  expect(dated.map((d) => d.publishedAt)).toEqual([
    "2026-09-23T11:58:00.000Z",
    "2026-09-23T11:59:00.000Z",
    "2026-09-23T12:00:00.000Z",
  ]);
});
