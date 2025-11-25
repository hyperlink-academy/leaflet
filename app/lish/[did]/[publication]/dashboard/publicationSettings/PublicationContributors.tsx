"use client";
import { MoreOptionsVerticalTiny } from "components/Icons/MoreOptionsVerticalTiny";
import { PubSettingsHeader } from "./PublicationSettings";
import { theme } from "tailwind.config";
import { Popover } from "components/Popover";
import { DeleteSmall } from "components/Icons/DeleteSmall";
import { useState } from "react";
import { Input } from "components/Input";
import { ButtonPrimary } from "components/Buttons";
import { PopoverArrow } from "components/Icons/PopoverArrow";
import { useSmoker } from "components/Toast";
import { usePublicationData } from "../PublicationSWRProvider";
import { getPublicationURL } from "app/lish/createPub/getPublicationURL";

export const PubContributorManager = (props: {
  backToMenuAction: () => void;
}) => {
  let contributors = [
    { name: "celine", status: "pending" },
    { name: "jared", status: "accepted" },
    { name: "brendan", status: "accepted" },
  ];
  return (
    <div>
      <PubSettingsHeader
        state={"contributors"}
        backToMenuAction={props.backToMenuAction}
      >
        Contributors
      </PubSettingsHeader>
      {contributors.length === 0 ? (
        <PubContributorsEmpty />
      ) : (
        <PubContributorsContent contributors={contributors} />
      )}
    </div>
  );
};

const PubContributorsEmpty = () => {
  return (
    <div className="flex flex-col gap-2 justify-center accent-container text-sm text-center sm:p-4 p-3 mb-1 mt-3">
      <PubContributorEmptyIllo />
      <div className="font-bold">
        Contributors can make drafts and publish in this publication!{" "}
      </div>
      <div className="text-secondary">
        They can't change publication settings or edit other people's work
        though.
      </div>
      {/*TODO ADD THE INVITE FLOW*/}
    </div>
  );
};

const PubContributorsContent = (props: {
  contributors: { name: string; status: string }[];
}) => {
  let [inputValue, setInputValue] = useState("");
  let smoker = useSmoker();
  let { data: pub } = usePublicationData();

  function getContributorLink(e: React.MouseEvent) {
    let pubUrl = getPublicationURL(pub?.publication!);
    navigator.clipboard.writeText(`${pubUrl}/invite-contributor`);

    smoker({
      text: "Copied Invite Link!",
      position: {
        y: e.clientY,
        x: e.clientX,
      },
    });
  }

  return (
    <div className="flex flex-col gap-1 pt-2">
      <div className="flex flex-col gap-0.5">
        <div className="font-bold text-tertiary text-sm">
          Add a New Contributor
        </div>
        <div className="input-with-border flex gap-1">
          <div className="text-tertiary">@</div>
          <Input
            placeholder="search bluesky handles"
            className="w-full outline-none! text-primary"
            value={inputValue}
            onChange={(e) => setInputValue(e.currentTarget.value)}
          />
        </div>
      </div>

      {/*ONLY SHOW ON ADD*/}
      <div className="flex flex-col gap-1 text-sm text-secondary text-center mb-2 mt-1 p-2 accent-container">
        <ButtonPrimary fullWidth compact onClick={(e) => getContributorLink(e)}>
          Copy Accept Invite Link
        </ButtonPrimary>
        Send this link to invited contributors to access this publication
      </div>
      <hr className="border-border-light" />

      {props.contributors.map((contributor) => {
        return (
          <div className="flex justify-between items-center">
            <div className="font-bold text-secondary truncate grow">
              {contributor.name}
            </div>

            <div className="flex gap-2 items-center">
              {contributor.status === "pending" && (
                <button
                  className="text-sm text-accent-contrast italic w-max shrink-0"
                  onClick={(e) => getContributorLink(e)}
                >
                  Copy Invite
                </button>
              )}

              <PubContributorOptions />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const PubContributorOptions = () => {
  return (
    <Popover trigger={<MoreOptionsVerticalTiny />}>
      <div className="menuItem flex gap-2 -mx-2! -my-1">
        <DeleteSmall /> Remove Contributor
      </div>
    </Popover>
  );
};

export const PubContributorEmptyIllo = () => {
  return (
    <svg
      width="52"
      height="40"
      viewBox="0 0 52 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mx-auto"
    >
      <path
        d="M0.0229335 14.6446C0.63646 8.1375 3.12717 6.38968 8.1976 4.40031C15.1643 1.66694 18.0542 5.27071 26.6984 11.4523C35.3425 17.6339 41.9359 12.8676 49.0059 20.9395C56.0759 29.0114 47.3939 36.9226 41.1227 39.2592C34.9882 41.5448 31.2246 37.1191 23.468 35.7604C15.7114 34.4016 -0.693068 22.2386 0.0229335 14.6446Z"
        fill={theme.colors["accent-2"]}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15.2537 16.6617C15.9514 16.604 16.4699 15.9951 16.4118 15.3018C16.3536 14.6085 15.7409 14.0933 15.0431 14.1511C12.4026 14.3698 9.81158 15.8192 7.89676 17.9171C5.97188 20.0259 4.64404 22.8821 4.64404 26.0347C4.64404 32.643 10.0355 38 16.6863 38C23.337 38 28.7285 32.643 28.7285 26.0347C28.7285 25.4713 28.7108 24.9476 28.6648 24.4471C29.1811 24.458 29.8511 24.4646 30.7221 24.4646H30.7442L30.7663 24.4638C37.3656 24.2349 42.644 18.8481 42.644 12.2357C42.644 5.47811 37.1307 0 30.3297 0C26.906 0 23.8067 1.38988 21.5762 3.62962C21.0837 4.12413 21.0879 4.92169 21.5856 5.41102C22.0833 5.90036 22.886 5.89617 23.3784 5.40166C25.1523 3.6205 27.6104 2.51933 30.3297 2.51933C35.7304 2.51933 40.1085 6.8695 40.1085 12.2357C40.1085 17.4789 35.9283 21.7526 30.6993 21.9453C29.3933 21.9451 28.5863 21.9295 28.0939 21.9105C27.7793 21.0871 27.3374 20.286 26.7523 19.3945C26.3698 18.8118 25.5843 18.6475 24.9979 19.0275C24.4114 19.4075 24.246 20.188 24.6285 20.7707C25.2962 21.7879 25.6688 22.5431 25.8875 23.2916C26.0143 23.7256 26.0966 24.1823 26.1435 24.7178C25.7065 24.6255 25.2338 24.626 24.7455 24.7415C23.0664 25.1389 22.2224 26.37 21.7321 27.7207C21.4946 28.3751 21.836 29.097 22.4946 29.333C23.1532 29.569 23.8797 29.2299 24.1173 28.5754C24.461 27.6286 24.8268 27.3121 25.333 27.1923C25.5356 27.1444 25.686 27.1871 25.7936 27.2578C25.9106 27.3347 26.0024 27.4622 26.0351 27.6208C26.0393 27.6411 26.0439 27.6612 26.049 27.681C25.2651 32.1131 21.3715 35.4807 16.6863 35.4807C11.4359 35.4807 7.17957 31.2516 7.17957 26.0347C7.17957 23.5939 8.21102 21.3229 9.77493 19.6095C11.3489 17.8851 13.3762 16.8172 15.2537 16.6617ZM12.8254 27.9333C13.1051 27.3836 13.4291 27.0736 13.7429 26.9096C14.0501 26.7489 14.4507 26.6737 14.9916 26.7711C15.3341 26.8327 15.5628 27.0166 15.746 27.323C15.9477 27.6603 16.0581 28.1023 16.0913 28.4906C16.1504 29.1838 16.764 29.6981 17.4616 29.6393C18.1593 29.5805 18.6769 28.9709 18.6177 28.2777C18.5637 27.6441 18.3824 26.7997 17.9258 26.0361C17.4507 25.2416 16.6547 24.5102 15.4438 24.2921C14.4313 24.1098 13.4422 24.2199 12.562 24.6801C11.6884 25.137 11.0274 25.8835 10.5627 26.7964C10.2468 27.4172 10.4972 28.175 11.122 28.4889C11.7468 28.8029 12.5095 28.5541 12.8254 27.9333ZM23.0683 15.3492C22.716 15.5988 22.3606 15.7116 22.0884 15.704C21.295 15.682 19.8534 14.6003 19.9217 12.1693C19.99 9.73829 21.4901 8.73827 22.2836 8.76028C23.077 8.7823 24.5186 9.86395 24.4503 12.295C24.4429 12.5561 24.4191 12.8007 24.3813 13.0293C24.1443 12.3038 23.4584 11.7792 22.6492 11.7792C21.6437 11.7792 20.8285 12.5892 20.8285 13.5883C20.8285 14.5874 21.6437 15.3974 22.6492 15.3974C22.7934 15.3974 22.9337 15.3807 23.0683 15.3492ZM26.5624 12.3536C26.4759 15.4301 24.4464 17.8697 22.0294 17.8026C19.6124 17.7356 17.7231 15.1872 17.8096 12.1107C17.896 9.03422 19.9255 6.5946 22.3425 6.66166C23.8206 6.70267 25.1013 7.67154 25.8535 9.12164C26.5934 8.91877 27.345 8.91534 28.0962 9.07137C28.8275 7.38253 30.2637 6.19705 31.9806 6.0923C34.6001 5.93248 36.8809 8.34904 37.075 11.4898C37.2691 14.6306 35.3029 17.3063 32.6834 17.4661C30.0639 17.6259 27.7831 15.2094 27.589 12.0686C27.578 11.89 27.5739 11.7129 27.5766 11.5377C27.2325 11.4677 26.8802 11.4585 26.5397 11.5474C26.5622 11.8111 26.5701 12.0802 26.5624 12.3536ZM32.554 15.3706C33.6551 15.3034 35.1125 13.9877 34.9661 11.6185C34.8197 9.24927 33.2113 8.12061 32.1101 8.18779C31.0089 8.25498 29.5515 9.57068 29.698 11.9399C29.7116 12.161 29.738 12.3712 29.7755 12.5707C30.0485 11.914 30.6995 11.4518 31.459 11.4518C32.4646 11.4518 33.2798 12.2618 33.2798 13.2609C33.2798 14.26 32.4646 15.07 31.459 15.07C31.4429 15.07 31.4269 15.0698 31.4109 15.0694C31.8009 15.2921 32.2032 15.392 32.554 15.3706Z"
        fill={theme.colors["accent-1"]}
      />
    </svg>
  );
};
