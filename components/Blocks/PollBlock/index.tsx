import { useUIState } from "src/useUIState";
import { BlockProps, BlockLayout } from "../Block";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { useCallback, useEffect, useState } from "react";
import { Input } from "components/Input";
import { focusElement } from "src/utils/focusElement";
import { Separator } from "components/Layout";
import { useEntitySetContext } from "components/EntitySetProvider";
import { theme } from "tailwind.config";
import { useEntity, useReplicache } from "src/replicache";
import { v7 } from "uuid";
import {
  useLeafletPublicationData,
  usePollData,
} from "components/PageSWRDataProvider";
import { voteOnPoll } from "actions/pollActions";
import { elementId } from "src/utils/elementId";
import { CheckTiny } from "components/Icons/CheckTiny";
import { CloseTiny } from "components/Icons/CloseTiny";
import { PublicationPollBlock } from "../PublicationPollBlock";
import { usePollBlockUIState } from "./pollBlockState";

export const PollBlock = (
  props: BlockProps & {
    areYouSure?: boolean;
    setAreYouSure?: (value: boolean) => void;
  },
) => {
  let { data: pub } = useLeafletPublicationData();
  if (!pub) return <LeafletPollBlock {...props} />;
  return <PublicationPollBlock {...props} />;
};

export const LeafletPollBlock = (
  props: BlockProps & {
    areYouSure?: boolean;
    setAreYouSure?: (value: boolean) => void;
  },
) => {
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  let { permissions } = useEntitySetContext();

  let { data: pollData } = usePollData();
  let hasVoted =
    pollData?.voter_token &&
    pollData.polls.find(
      (v) =>
        v.poll_votes_on_entity.voter_token === pollData.voter_token &&
        v.poll_votes_on_entity.poll_entity === props.entityID,
    );

  let pollState = usePollBlockUIState((s) => s[props.entityID]?.state);
  if (!pollState) {
    if (hasVoted) pollState = "results";
    else pollState = "voting";
  }

  const setPollState = useCallback(
    (state: "editing" | "voting" | "results") => {
      usePollBlockUIState.setState((s) => ({ [props.entityID]: { state } }));
    },
    [],
  );

  let votes =
    pollData?.polls.filter(
      (v) => v.poll_votes_on_entity.poll_entity === props.entityID,
    ) || [];
  let totalVotes = votes.length;

  return (
    <BlockLayout
      isSelected={!!isSelected}
      hasBackground={"accent"}
      areYouSure={props.areYouSure}
      setAreYouSure={props.setAreYouSure}
      className="poll flex flex-col gap-2 w-full"
    >
      {pollState === "editing" ? (
        <EditPoll
          totalVotes={totalVotes}
          votes={votes.map((v) => v.poll_votes_on_entity)}
          entityID={props.entityID}
          close={() => {
            if (hasVoted) setPollState("results");
            else setPollState("voting");
          }}
        />
      ) : pollState === "results" ? (
        <PollResults
          entityID={props.entityID}
          pollState={pollState}
          setPollState={setPollState}
          hasVoted={!!hasVoted}
        />
      ) : (
        <PollVote
          entityID={props.entityID}
          onSubmit={() => setPollState("results")}
          pollState={pollState}
          setPollState={setPollState}
          hasVoted={!!hasVoted}
        />
      )}
    </BlockLayout>
  );
};

const PollVote = (props: {
  entityID: string;
  onSubmit: () => void;
  pollState: "editing" | "voting" | "results";
  setPollState: (pollState: "editing" | "voting" | "results") => void;
  hasVoted: boolean;
}) => {
  let { data, mutate } = usePollData();
  let { permissions } = useEntitySetContext();

  let pollOptions = useEntity(props.entityID, "poll/options");
  let currentVotes = data?.voter_token
    ? data.polls
        .filter(
          (p) =>
            p.poll_votes_on_entity.poll_entity === props.entityID &&
            p.poll_votes_on_entity.voter_token === data.voter_token,
        )
        .map((v) => v.poll_votes_on_entity.option_entity)
    : [];
  let [selectedPollOptions, setSelectedPollOptions] =
    useState<string[]>(currentVotes);

  return (
    <>
      {pollOptions.map((option, index) => (
        <PollVoteButton
          key={option.data.value}
          selected={selectedPollOptions.includes(option.data.value)}
          toggleSelected={() =>
            setSelectedPollOptions((s) =>
              s.includes(option.data.value)
                ? s.filter((s) => s !== option.data.value)
                : [...s, option.data.value],
            )
          }
          entityID={option.data.value}
        />
      ))}
      <div className="flex justify-between items-center">
        <div className="flex justify-end gap-2">
          {permissions.write && (
            <button
              className="pollEditOptions w-fit flex gap-2 items-center justify-start text-sm text-accent-contrast"
              onClick={() => {
                props.setPollState("editing");
              }}
            >
              Edit Options
            </button>
          )}

          {permissions.write && <Separator classname="h-6" />}
          <PollStateToggle
            setPollState={props.setPollState}
            pollState={props.pollState}
            hasVoted={props.hasVoted}
          />
        </div>
        <ButtonPrimary
          className="place-self-end"
          onClick={async () => {
            await voteOnPoll(props.entityID, selectedPollOptions);
            mutate((oldState) => {
              if (!oldState || !oldState.voter_token) return;
              return {
                ...oldState,
                polls: [
                  ...oldState.polls.filter(
                    (p) =>
                      !(
                        p.poll_votes_on_entity.voter_token ===
                          oldState.voter_token &&
                        p.poll_votes_on_entity.poll_entity == props.entityID
                      ),
                  ),
                  ...selectedPollOptions.map((option_entity) => ({
                    poll_votes_on_entity: {
                      option_entity,
                      entities: { set: "" },
                      poll_entity: props.entityID,
                      voter_token: oldState.voter_token!,
                    },
                  })),
                ],
              };
            });
            props.onSubmit();
          }}
          disabled={
            selectedPollOptions.length === 0 ||
            (selectedPollOptions.length === currentVotes.length &&
              selectedPollOptions.every((s) => currentVotes.includes(s)))
          }
        >
          Vote!
        </ButtonPrimary>
      </div>
    </>
  );
};
const PollVoteButton = (props: {
  entityID: string;
  selected: boolean;
  toggleSelected: () => void;
}) => {
  let optionName = useEntity(props.entityID, "poll-option/name")?.data.value;
  if (!optionName) return null;
  if (props.selected)
    return (
      <div className="flex gap-2 items-center">
        <ButtonPrimary
          className={`pollOption grow max-w-full flex`}
          onClick={() => {
            props.toggleSelected();
          }}
        >
          {optionName}
        </ButtonPrimary>
      </div>
    );
  return (
    <div className="flex gap-2 items-center">
      <ButtonSecondary
        className={`pollOption grow max-w-full flex`}
        onClick={() => {
          props.toggleSelected();
        }}
      >
        {optionName}
      </ButtonSecondary>
    </div>
  );
};

const PollResults = (props: {
  entityID: string;
  pollState: "editing" | "voting" | "results";
  setPollState: (pollState: "editing" | "voting" | "results") => void;
  hasVoted: boolean;
}) => {
  let { data } = usePollData();
  let { permissions } = useEntitySetContext();
  let pollOptions = useEntity(props.entityID, "poll/options");
  let pollData = data?.pollVotes.find((p) => p.poll_entity === props.entityID);
  let votesByOptions = pollData?.votesByOption || {};
  let highestVotes = Math.max(...Object.values(votesByOptions));
  let winningOptionEntities = Object.entries(votesByOptions).reduce<string[]>(
    (winningEntities, [entity, votes]) => {
      if (votes === highestVotes) winningEntities.push(entity);
      return winningEntities;
    },
    [],
  );
  return (
    <>
      {pollOptions.map((p) => (
        <PollResult
          key={p.id}
          winner={winningOptionEntities.includes(p.data.value)}
          entityID={p.data.value}
          totalVotes={pollData?.unique_votes || 0}
          votes={pollData?.votesByOption[p.data.value] || 0}
        />
      ))}
      <div className="flex  gap-2">
        {permissions.write && (
          <button
            className="pollEditOptions w-fit flex gap-2 items-center justify-start text-sm text-accent-contrast"
            onClick={() => {
              props.setPollState("editing");
            }}
          >
            Edit Options
          </button>
        )}

        {permissions.write && <Separator classname="h-6" />}
        <PollStateToggle
          setPollState={props.setPollState}
          pollState={props.pollState}
          hasVoted={props.hasVoted}
        />
      </div>
    </>
  );
};

const PollResult = (props: {
  entityID: string;
  votes: number;
  totalVotes: number;
  winner: boolean;
}) => {
  let optionName = useEntity(props.entityID, "poll-option/name")?.data.value;
  return (
    <div
      className={`pollResult relative grow py-0.5 px-2 border-accent-contrast rounded-md overflow-hidden ${props.winner ? "font-bold border-2" : "border"}`}
    >
      <div
        style={{
          WebkitTextStroke: `${props.winner ? "6px" : "6px"} ${theme.colors["bg-page"]}`,
          paintOrder: "stroke fill",
        }}
        className={`pollResultContent text-accent-contrast relative flex gap-2 justify-between z-10`}
      >
        <div className="grow max-w-full truncate">{optionName}</div>
        <div>{props.votes}</div>
      </div>
      <div
        className={`pollResultBG absolute bg-bg-page w-full top-0 bottom-0 left-0 right-0 flex flex-row z-0`}
      >
        <div
          className={`bg-accent-contrast rounded-[2px] m-0.5`}
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

const EditPoll = (props: {
  votes: { option_entity: string }[];
  totalVotes: number;
  entityID: string;
  close: () => void;
}) => {
  let pollOptions = useEntity(props.entityID, "poll/options");
  let { rep } = useReplicache();
  let permission_set = useEntitySetContext();
  let [localPollOptionNames, setLocalPollOptionNames] = useState<{
    [k: string]: string;
  }>({});
  return (
    <>
      {props.totalVotes > 0 && (
        <div className="text-sm italic text-tertiary">
          You can&apos;t edit options people already voted for!
        </div>
      )}

      {pollOptions.length === 0 && (
        <div className="text-center italic text-tertiary text-sm">
          no options yet...
        </div>
      )}
      {pollOptions.map((p) => (
        <EditPollOption
          key={p.id}
          entityID={p.data.value}
          pollEntity={props.entityID}
          disabled={!!props.votes.find((v) => v.option_entity === p.data.value)}
          localNameState={localPollOptionNames[p.data.value]}
          setLocalNameState={setLocalPollOptionNames}
        />
      ))}

      <button
        className="pollAddOption w-fit flex gap-2 items-center justify-start text-sm text-accent-contrast"
        onClick={async () => {
          let pollOptionEntity = v7();
          await rep?.mutate.addPollOption({
            pollEntity: props.entityID,
            pollOptionEntity,
            pollOptionName: "",
            permission_set: permission_set.set,
            factID: v7(),
          });

          focusElement(
            document.getElementById(
              elementId.block(props.entityID).pollInput(pollOptionEntity),
            ) as HTMLInputElement | null,
          );
        }}
      >
        Add an Option
      </button>

      <hr className="border-border" />
      <ButtonPrimary
        className="place-self-end"
        onClick={async () => {
          // remove any poll options that have no name
          // look through the localPollOptionNames object and remove any options that have no name
          let emptyOptions = Object.entries(localPollOptionNames).filter(
            ([optionEntity, optionName]) => optionName === "",
          );
          await Promise.all(
            emptyOptions.map(
              async ([entity]) =>
                await rep?.mutate.removePollOption({
                  optionEntity: entity,
                }),
            ),
          );

          await rep?.mutate.assertFact(
            Object.entries(localPollOptionNames)
              .filter(([, name]) => !!name)
              .map(([entity, name]) => ({
                entity,
                attribute: "poll-option/name",
                data: { type: "string", value: name },
              })),
          );
          props.close();
        }}
      >
        Save <CheckTiny />
      </ButtonPrimary>
    </>
  );
};

const EditPollOption = (props: {
  entityID: string;
  pollEntity: string;
  localNameState: string | undefined;
  setLocalNameState: (
    s: (s: { [k: string]: string }) => { [k: string]: string },
  ) => void;
  disabled: boolean;
}) => {
  let { rep } = useReplicache();
  let optionName = useEntity(props.entityID, "poll-option/name")?.data.value;
  useEffect(() => {
    props.setLocalNameState((s) => ({
      ...s,
      [props.entityID]: optionName || "",
    }));
  }, [optionName, props.setLocalNameState, props.entityID]);

  return (
    <div className="flex gap-2 items-center">
      <Input
        id={elementId.block(props.pollEntity).pollInput(props.entityID)}
        type="text"
        className="pollOptionInput w-full input-with-border"
        placeholder="Option here..."
        disabled={props.disabled}
        value={
          props.localNameState === undefined ? optionName : props.localNameState
        }
        onChange={(e) => {
          props.setLocalNameState((s) => ({
            ...s,
            [props.entityID]: e.target.value,
          }));
        }}
        onKeyDown={(e) => {
          if (e.key === "Backspace" && !e.currentTarget.value) {
            e.preventDefault();
            rep?.mutate.removePollOption({ optionEntity: props.entityID });
          }
        }}
      />

      <button
        tabIndex={-1}
        disabled={props.disabled}
        className="text-accent-contrast disabled:text-border"
        onMouseDown={async () => {
          await rep?.mutate.removePollOption({ optionEntity: props.entityID });
        }}
      >
        <CloseTiny />
      </button>
    </div>
  );
};

const PollStateToggle = (props: {
  setPollState: (pollState: "editing" | "voting" | "results") => void;
  hasVoted: boolean;
  pollState: "editing" | "voting" | "results";
}) => {
  return (
    <button
      className="text-sm text-accent-contrast "
      onClick={() => {
        props.setPollState(props.pollState === "voting" ? "results" : "voting");
      }}
    >
      {props.pollState === "voting"
        ? "See Results"
        : props.hasVoted
          ? "Change Vote"
          : "Back to Poll"}
    </button>
  );
};
