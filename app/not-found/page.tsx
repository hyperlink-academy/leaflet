export default function NotFound() {
  return (
    <div className="w-screen h-screen flex place-items-center bg-bg-leaflet">
      <div className="bg-bg-page mx-auto p-4 border border-border rounded-md flex flex-col text-center justify-centergap-1 w-fit">
        <div className="font-bold">
          Hmmm... Couldn&apos;t find that leaflet.
        </div>
        <div>
          You can{" "}
          <a href="mailto:contact@hyperlink.academy" target="blank">
            email us
          </a>{" "}
          for help!
        </div>
      </div>
    </div>
  );
}
