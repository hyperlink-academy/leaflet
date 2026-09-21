"use client";
import { useIdentityData } from "components/IdentityProvider";
import { ButtonPrimary, ButtonTertiary } from "components/Buttons";
import { LoginModal } from "components/LoginButton";
import { SpeedyLink } from "components/SpeedyLink";
import { ReaderButton, WriterButton, useNavSide } from "./NavigationButtons";
import { WriterSmall } from "components/Icons/WriterSmall";
import { ReaderUnreadSmall } from "components/Icons/ReaderSmall";
import { TutorialNavTooltip } from "app/(app)/(identity)/(home-pages)/(writer)/home/Tutorial/TutorialNavTooltip";

export function NavigationBanner() {
  let { identity } = useIdentityData();
  let side = useNavSide();

  if (side === "reader") {
    let hasDocs =
      (identity?.permission_token_on_homepage.length ?? 0) > 0 ||
      (identity?.contributor_leaflets?.length ?? 0) > 0;
    if (identity && hasDocs) return <WriterButton />;
    return <WriterBanner loggedIn={!!identity} />;
  }

  let hasSubs = (identity?.publication_subscriptions?.length ?? 0) > 0;
  if (identity && hasSubs) return <ReaderButton />;
  return <ReaderBanner />;
}

const WriterBanner = (props: { loggedIn: boolean }) => {
  return (
    <BannerContainer>
      <WriterSmall className="mx-auto" />
      <h4 className="leading-snug">Start a Publication with Leaflet</h4>
      <small className="text-secondary pb-2">
        A blog, newsletter, comic, novel, course, log, journal, zine…
      </small>
      {props.loggedIn ? (
        <SpeedyLink eager href="/home" className="hover:no-underline!">
          <ButtonPrimary className="mx-auto ">Start Writing!</ButtonPrimary>
        </SpeedyLink>
      ) : (
        <LoginModal
          asChild
          redirectRoute="/home"
          trigger={
            <ButtonPrimary className="mx-auto ">Start Writing!</ButtonPrimary>
          }
        />
      )}
    </BannerContainer>
  );
};

const ReaderBanner = () => {
  return (
    <BannerContainer>
      <ReaderUnreadSmall className="mx-auto " />
      <h4 className="">Explore a Publications on the Atmosphere</h4>
      <small className="text-secondary pb-1">
        Discover, read, and subscribe to new and amazing things
      </small>
      <SpeedyLink eager href="/reader/trending" className="hover:no-underline!">
        <ButtonPrimary className="mx-auto">Explore!</ButtonPrimary>
      </SpeedyLink>
    </BannerContainer>
  );
};

const BannerContainer = (props: { children: React.ReactNode }) => {
  return (
    <TutorialNavTooltip
      target="banner"
      className="navigationBanner accent-container flex flex-col justify-center gap-1 px-2 py-3 text-center text-sm leading-snug mb-2"
    >
      {props.children}
    </TutorialNavTooltip>
  );
};
