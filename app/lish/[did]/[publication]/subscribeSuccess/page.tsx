import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { RSSSmall } from "components/Icons/RSSSmall";

export default function SubscribeSuccess() {
  return (
    <div className="h-screen w-screen bg-bg-leaflet flex place-items-center text-center ">
      <div className="container p-4 max-w-md mx-auto justify-center place-items-center flex flex-col gap-2">
        <h3 className="text-secondary">You've Subscribed!</h3>
        <div className="text-tertiary">
          Add this custom feed to your Bluesky to get the updates from this and
          ALL leaflet publications you subscribe to!
        </div>

        <div className="flex flex-row gap-3 mt-3">
          <ButtonPrimary>Add Custom Feed</ButtonPrimary>
          <button className="text-accent-contrast">
            <RSSSmall />
          </button>
        </div>
      </div>
    </div>
  );
}
