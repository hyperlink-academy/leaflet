import SortButtons from "./SortButtons";

export default function Discover() {
  return (
    <div className="bg-bg-leafet h-full max-w-prose mx-auto sm:py-6 py-4 ">
      <div className="discoverHeader flex flex-col ">
        <h1>Discover</h1>
        <p className="text-lg text-secondary italic">
          Check out all the coolest publications on Leaflet!
        </p>
        <SortButtons />
      </div>
      <div className="discoverPubList flex flex-col gap-3 pt-6">
        <PubListing />
        <PubListing />
        <PubListing />
      </div>
    </div>
  );
}

const PubListing = () => {
  return (
    <>
      <div className="flex gap-2">
        <div className="w-6 h-6 mt-0.5 rounded-full bg-test" />
        <div className="flex flex-col">
          <h3>Pup: The Puglication</h3>
          <p className="text-secondary">
            A publication dedicated to only the highest quality pugs.{" "}
          </p>
          <div className="flex gap-2 text-sm text-tertiary pt-2 items-center">
            <p>celine</p>
            <div className="w-1 h-4 border-l border-border-light" />
            <p>Updated 6/23/2025</p>
          </div>
        </div>
      </div>
      <hr className="last:hidden border-border-light" />
    </>
  );
};
