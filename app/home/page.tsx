import { PaintSmall } from "components/Icons";
import { Media } from "./Media";

export default function Home() {
  return (
    <div className=" bg-bg-page flex">
      <div className="max-w-screen-lg w-full mx-auto p-3 pb-6 sm:p-6 sm:pb-12 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between w-full items-center">
          <div>
            <PaintSmall />
          </div>
          <div className="flex gap-2 items-center">
            <div className="text-m text-tertiary">sort: recent</div>
            <input
              className="w-full sm:w-72 bg-transparent border border-border rounded-md px-2 py-1 outline-none"
              placeholder="search"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 sm:grid-cols-3 gap-6">
          <Doc />
          <Doc />
          <Doc />
          <Doc />
          <Doc />
          <Doc />
          <Doc />
          <Doc />
          <Doc />
          <Doc />
          <Doc />
          <Doc />
          <Doc />
          <Doc />
          <Doc />
          <Doc />
          <Doc />
          <Doc />
        </div>
      </div>
    </div>
  );
}

const Doc = () => {
  return (
    <div className="doc flex flex-row sm:flex-col gap-3 sm:gap-1 grow basis-64  ">
      <div className="docPreview  w-32 h-24 px-2 pt-2 sm:w-full sm:h-40 sm:px-3 sm:pt-2 border border-border rounded-lg flex items-end">
        <div className="bg-bg-card w-full h-full sm:max-w-48 sm:max-h-36 mx-auto border border-border-light border-b-0 rounded-t-lg p-2 flex flex-col gap-0 overflow-hidden text-sm">
          <div>hello!</div>
          <div>
            This is an example of a document that I am writing to get a sense of
            what it would look like!
          </div>
          <div>
            If there were to be another paragraph it wouls look just like this!
          </div>
        </div>
      </div>
      <div className="docDescription flex flex-col grow gap-0">
        <h4 className="line-clamp-3 sm:line-clamp-1">
          Title is really long and goes several several several lines and wraped
          them a lot and all kinds of shit and somehow still needs more and
          stuff so here we go
        </h4>
        <p className="text-tertiary">6/2/2024</p>
      </div>
    </div>
  );
};
