// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { PublicationPostsListPost } from "src/utils/buildPublicationPosts";
import { buildPostsListIndex } from "src/utils/postsListPagination";

vi.mock("./PublicationPostsList", () => ({
  PublicationPostsList: (props: { posts: PublicationPostsListPost[] }) =>
    React.createElement(
      "ul",
      null,
      props.posts.map((p) => React.createElement("li", { key: p.uri }, p.uri)),
    ),
}));

let controls: { setState: (s: any) => void } | null = null;
vi.mock("./PostsListReaderControls", () => ({
  PostsListReaderControlsBar: (props: any) => {
    controls = props;
    return null;
  },
}));

import { PaginatedPublicationPostsList } from "./PaginatedPublicationPostsList";

type Observer = { trigger: () => void };
let observers: Observer[] = [];
class FakeIntersectionObserver {
  cb: IntersectionObserverCallback;
  constructor(cb: IntersectionObserverCallback) {
    this.cb = cb;
    observers.push({
      trigger: () => this.cb([{ isIntersecting: true } as any], this as any),
    });
  }
  observe() {}
  disconnect() {}
}

const post = (i: number): PublicationPostsListPost => ({
  uri: `at://did/p/${String(i).padStart(3, "0")}`,
  record: {
    title: `Post ${i}`,
    publishedAt: new Date(2026, 0, 1, 0, i).toISOString(),
  } as any,
  commentsCount: 0,
  mentionsCount: 0,
  recommendsCount: 0,
  membersOnly: false,
});
// Newest first, so the list order is 49, 48, ... 0.
const all = Array.from({ length: 50 }, (_, i) => post(49 - i));
const uris = all.map((p) => p.uri);
const byUri = new Map(all.map((p) => [p.uri, p]));

let root: Root;
let container: HTMLElement;
const rendered = () =>
  Array.from(container.querySelectorAll("li")).map((li) => li.textContent);
const loading = () => container.textContent?.includes("Loading more posts");
const flush = () => act(async () => {});

beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  (globalThis as any).IntersectionObserver = FakeIntersectionObserver;
  observers = [];
  controls = null;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const render = (
  props: Partial<React.ComponentProps<typeof PaginatedPublicationPostsList>>,
) =>
  act(async () => {
    root.render(
      React.createElement(PaginatedPublicationPostsList, {
        publication: { uri: "at://did/pub/x", record: {} },
        publicationRecord: null,
        uris,
        knownPosts: all.slice(0, 20),
        ...props,
      }),
    );
  });

describe("PaginatedPublicationPostsList", () => {
  it("renders the seeded first page without fetching", async () => {
    const loadBatch = vi.fn(async (batch: string[]) =>
      batch.map((u) => byUri.get(u)!),
    );
    await render({ loadBatch });
    expect(rendered()).toEqual(uris.slice(0, 20));
    expect(loadBatch).not.toHaveBeenCalled();
    expect(loading()).toBe(false);
  });

  it("hydrates the next page on scroll and only what it lacks", async () => {
    const loadBatch = vi.fn(async (batch: string[]) =>
      batch.map((u) => byUri.get(u)!),
    );
    await render({ loadBatch });
    await act(async () => observers.at(-1)!.trigger());
    expect(loadBatch).toHaveBeenCalledTimes(1);
    expect(loadBatch.mock.calls[0][0]).toEqual(uris.slice(20, 40));
    await flush();
    expect(rendered()).toEqual(uris.slice(0, 40));
    expect(loading()).toBe(false);
  });

  it("serves a re-sorted list from already hydrated posts", async () => {
    const loadBatch = vi.fn(async (batch: string[]) =>
      batch.map((u) => byUri.get(u)!),
    );
    const index = buildPostsListIndex(all);
    await render({
      uris: undefined,
      index,
      loadBatch,
      readerControls: { search: true, tagFilter: true, sort: true },
    });
    expect(rendered()).toEqual(uris.slice(0, 20));
    // "post 4" matches Post 4, 14, 24, 34 and 40-49. Only 4, 14 and 24 fall
    // outside the seeded first page, so they are the whole request.
    await act(async () =>
      controls!.setState({ search: "post 4", tags: [], sort: "latest" }),
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 250));
    });
    expect(loadBatch).toHaveBeenCalledTimes(1);
    expect(loadBatch.mock.calls[0][0]).toEqual(
      [24, 14, 4].map((i) => post(i).uri),
    );
    await flush();
    const matches = [
      ...uris.slice(0, 10),
      ...[34, 24, 14, 4].map((i) => post(i).uri),
    ];
    expect(rendered()).toEqual(matches);
    // Switching to oldest reorders without another request.
    await act(async () =>
      controls!.setState({ search: "post 4", tags: [], sort: "oldest" }),
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 250));
    });
    expect(loadBatch).toHaveBeenCalledTimes(1);
    expect(rendered()).toEqual([...matches].reverse());
  });

  it("does not re-request a post the loader came back without", async () => {
    const loadBatch = vi.fn(async (batch: string[]) =>
      batch.filter((u) => u !== uris[25]).map((u) => byUri.get(u)!),
    );
    await render({ loadBatch });
    await act(async () => observers.at(-1)!.trigger());
    await flush();
    expect(loadBatch).toHaveBeenCalledTimes(1);
    expect(rendered()).toEqual(uris.slice(0, 40).filter((u) => u !== uris[25]));
    expect(loading()).toBe(false);
  });

  it("treats every post as known in the editor", async () => {
    await render({ knownPosts: all, loadBatch: undefined });
    await act(async () => observers.at(-1)!.trigger());
    expect(rendered()).toEqual(uris.slice(0, 40));
    expect(loading()).toBe(false);
  });
});
