import { RpcTarget } from "capnweb";

export type EmbedBlockData =
  | { type: "text"; content: string }
  | {
      type: "embed";
      url: string;
      height?: number;
      aspectRatio?: string;
    };

export type PartsPageHandlers = {
  onOpen: (url: string) => void;
  onReplaceWith: (block: EmbedBlockData) => void;
  onAddBelow: (block: EmbedBlockData) => void;
};

export class PartsPageHost extends RpcTarget {
  #handlers: PartsPageHandlers;

  constructor(handlers: PartsPageHandlers) {
    super();
    this.#handlers = handlers;
  }

  open(url: string) {
    this.#handlers.onOpen(url);
  }

  replaceWith(block: EmbedBlockData) {
    this.#handlers.onReplaceWith(block);
  }

  addBelow(block: EmbedBlockData) {
    this.#handlers.onAddBelow(block);
  }
}
