import { RpcTarget } from "capnweb";

export class PartsPageHost extends RpcTarget {
  #onOpen: (url: string) => void;

  constructor(handlers: { onOpen: (url: string) => void }) {
    super();
    this.#onOpen = handlers.onOpen;
  }

  open(url: string) {
    this.#onOpen(url);
  }
}
