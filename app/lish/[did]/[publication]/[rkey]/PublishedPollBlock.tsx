"use client";

import { PubLeafletBlocksPoll, PubLeafletPollDefinition } from "lexicons/api";
import { useState, useEffect } from "react";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { useIdentityData } from "components/IdentityProvider";
import { AtpAgent } from "@atproto/api";
import { voteOnPublishedPoll } from "./voteOnPublishedPoll";
import { PollData } from "./fetchPollData";
import { Popover } from "components/Popover";
import LoginForm from "app/login/LoginForm";
import { BlueskyTiny } from "components/Icons/BlueskyTiny";

export const PublishedPollBlock = (props: {
  block: PubLeafletBlocksPoll.Main;
  pollData: PollData;
  className?: string;
}) => {
  const { identity } = useIdentityData();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  let pollRecord = props.pollData.record as PubLeafletPollDefinition.Record;
  let [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleVote = async () => {
    if (!selectedOption) return;

    setIsVoting(true);
    try {
      const result = await voteOnPublishedPoll(
        props.block.pollRef.uri,
        props.block.pollRef.cid,
        selectedOption,
      );

      if (result.success) {
        setShowResults(true);
      } else {
        console.error("Failed to vote:", result.error);
      }
    } catch (error) {
      console.error("Failed to vote:", error);
    } finally {
      setIsVoting(false);
    }
  };

  const hasVoted =
    !!identity?.atp_did &&
    !!props.pollData?.atp_poll_votes.find(
      (v) => v.voter_did === identity?.atp_did,
    );
  const displayResults = showResults || hasVoted;

  return (
    <div
      className={`poll flex flex-col gap-2 p-3 w-full ${props.className} block-border`}
      style={{
        backgroundColor:
          "color-mix(in oklab, rgb(var(--accent-1)), rgb(var(--bg-page)) 85%)",
      }}
    >
      {displayResults ? (
        <PollResults
          pollData={props.pollData}
          hasVoted={hasVoted}
          setShowResults={setShowResults}
        />
      ) : (
        <>
          {pollRecord.options.map((option, index) => (
            <PollOptionButton
              key={index}
              option={option}
              optionIndex={index.toString()}
              selected={selectedOption === index.toString()}
              onSelect={() => setSelectedOption(index.toString())}
            />
          ))}
          <div className="flex justify-between items-center">
            <div className="flex justify-end gap-2">
              {identity?.atp_did && (
                <button
                  className="w-fit flex gap-2 items-center justify-start text-sm text-accent-contrast"
                  onClick={() => setShowResults(!showResults)}
                >
                  See Results
                </button>
              )}
            </div>
            {identity?.atp_did ? (
              <ButtonPrimary
                className="place-self-end"
                onClick={handleVote}
                disabled={!selectedOption || isVoting}
              >
                {isVoting ? "Voting..." : "Vote!"}
              </ButtonPrimary>
            ) : (
              <Popover
                asChild
                trigger={
                  <ButtonPrimary className="place-self-center">
                    <BlueskyTiny /> Login to vote
                  </ButtonPrimary>
                }
              >
                {isClient && (
                  <LoginForm
                    text="Log in to vote on this poll!"
                    noEmail
                    redirectRoute={window?.location.href + "?refreshAuth"}
                  />
                )}
              </Popover>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const PollOptionButton = (props: {
  option: PubLeafletPollDefinition.Option;
  optionIndex: string;
  selected: boolean;
  onSelect: () => void;
}) => {
  const ButtonComponent = props.selected ? ButtonPrimary : ButtonSecondary;

  return (
    <div className="flex gap-2 items-center">
      <ButtonComponent
        className="pollOption grow max-w-full flex"
        onClick={props.onSelect}
      >
        {props.option.text}
      </ButtonComponent>
    </div>
  );
};

const PollResults = (props: {
  pollData: PollData;
  hasVoted: boolean;
  setShowResults: (show: boolean) => void;
}) => {
  const totalVotes = props.pollData.atp_poll_votes.length || 0;
  let pollRecord = props.pollData.record as PubLeafletPollDefinition.Record;
  let optionsWithCount = pollRecord.options.map((o, index) => ({
    ...o,
    votes: props.pollData.atp_poll_votes.filter(
      (v) => v.option == index.toString(),
    ),
  }));

  const highestVotes = Math.max(...optionsWithCount.map((o) => o.votes.length));
  return (
    <>
      {pollRecord.options.map((option, index) => {
        const votes = props.pollData?.atp_poll_votes.filter(
          (v) => v.option === index.toString(),
        ).length;
        const isWinner = totalVotes > 0 && votes === highestVotes;

        return (
          <PollResult
            key={index}
            option={option}
            votes={votes}
            totalVotes={totalVotes}
            winner={isWinner}
          />
        );
      })}
    </>
  );
};

const PollResult = (props: {
  option: PubLeafletPollDefinition.Option;
  votes: number;
  totalVotes: number;
  winner: boolean;
}) => {
  return (
    <div
      className={`pollResult relative grow py-0.5 px-2 border-accent-contrast rounded-md overflow-hidden ${props.winner ? "font-bold border-2" : "border"}`}
    >
      <div
        style={{
          WebkitTextStroke: `${props.winner ? "6px" : "6px"} rgb(var(--bg-page))`,
          paintOrder: "stroke fill",
        }}
        className="pollResultContent text-accent-contrast relative flex gap-2 justify-between z-10"
      >
        <div className="grow max-w-full truncate">{props.option.text}</div>
        <div>{props.votes}</div>
      </div>
      <div className="pollResultBG absolute bg-bg-page w-full top-0 bottom-0 left-0 right-0 flex flex-row z-0">
        <div
          className="bg-accent-contrast rounded-[2px] m-0.5"
          style={{
            maskImage: "var(--hatchSVG)",
            maskRepeat: "repeat repeat",
            ...(props.votes === 0
              ? { width: "4px" }
              : { flexBasis: `${(props.votes / props.totalVotes) * 100}%` }),
          }}
        />
        <div />
      </div>
    </div>
  );
};
