import { mainSiteAuthBase } from "src/utils/customDomain";
import { ButtonPrimary } from "./Buttons";
import { GoToArrowLined } from "./Icons/GoToArrowLined";

export function CreateLeafletAd(props: { className?: string }) {
  return (
    <div
      className={`accent-container flex gap-3 items-center p-3  font-bold  ${props.className ?? ""}`}
    >
      <img
        src="/illustrations/start-a-publication.webp"
        alt=""
        className="h-auto w-24 object-contain shrink-0"
      />
      <div className="flex flex-col gap-2">
        Or reply with a post from your very own blog!
        <a href={`${mainSiteAuthBase()}/lish/createPub`} className={``}>
          <ButtonPrimary compact className="">
            Blog on Leaflet <GoToArrowLined />
          </ButtonPrimary>
        </a>
      </div>
    </div>
  );
}
