import { useUIState } from "src/useUIState";
import { BlockProps } from "./Block";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { useEffect, useState } from "react";
import { Input } from "components/Input";
import { CheckTiny, CloseTiny, InfoSmall } from "components/Icons";
import { Separator } from "components/Layout";
import { useEntitySetContext } from "components/EntitySetProvider";
import { theme } from "tailwind.config";
import { useEntity, useReplicache } from "src/replicache";
import { v7 } from "uuid";
import { usePollData } from "components/PageSWRDataProvider";
import { voteOnPoll } from "actions/pollActions";

export const PollBlock = (props: BlockProps) => {
  let { rep } = useReplicache();
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  let { permissions } = useEntitySetContext();

  let [pollState, setPollState] = useState<"editing" | "voting" | "results">(
    !permissions.write ? "voting" : "editing",
  );

  let dataPollOptions = useEntity(props.entityID, "poll/options");
  let { data: pollData } = usePollData();

  let [localPollOptionNames, setLocalPollOptionNames] = useState<{
    [k: string]: string;
  }>({});
  let votes =
    pollData?.polls.filter(
      (v) => v.poll_votes_on_entity.poll_entity === props.entityID,
    ) || [];
  let totalVotes = votes.length;

  let votesByOptions = votes.reduce<{ [option: string]: number }>(
    (results, vote) => {
      results[vote.poll_votes_on_entity.option_entity] =
        (results[vote.poll_votes_on_entity.option_entity] || 0) + 1;
      return results;
    },
    {},
  );

  let highestVotes = Math.max(...Object.values(votesByOptions));

  let winningOptionEntities = Object.entries(votesByOptions).reduce<string[]>(
    (winningEntities, [entity, votes]) => {
      if (votes === highestVotes) winningEntities.push(entity);
      return winningEntities;
    },
    [],
  );

  return (
    <div
      className={`poll flex flex-col gap-2  p-3 w-full
        ${isSelected ? "block-border-selected " : "block-border"}`}
      style={{
        backgroundColor:
          "color-mix(in oklab, rgb(var(--accent-1)), rgb(var(--bg-page)) 85%)",
      }}
    >
      {pollState === "editing" && totalVotes > 0 && (
        <div className="text-sm italic text-tertiary">
          You can&apos;t edit options people already voted for!
        </div>
      )}

      {/* Empty state if no options yet */}
      {dataPollOptions.length === 0 && pollState !== "editing" && (
        <div className="text-center italic text-tertiary text-sm">
          no options yet...
        </div>
      )}

      {dataPollOptions.map((option, index) => (
        <PollOption
          pollEntity={props.entityID}
          localNameState={localPollOptionNames[option.data.value]}
          setLocalNameState={setLocalPollOptionNames}
          entityID={option.data.value}
          key={option.data.value}
          state={pollState}
          setState={setPollState}
          votes={votesByOptions[option.data.value] || 0}
          totalVotes={totalVotes}
          winner={winningOptionEntities.includes(option.data.value)}
        />
      ))}
      {!permissions.write ? null : pollState === "editing" ? (
        <>
          <AddPollOptionButton entityID={props.entityID} />
          <hr className="border-border" />
          <ButtonPrimary
            className="place-self-end"
            onMouseDown={() => {
              setPollState("voting");

              // Update the poll option names
              // rep?.mutate.assertFact(
              //   Object.entries(localPollOptionNames).map(([entity, name]) => ({
              //     entity,
              //     attribute: "poll-option/name",
              //     data: { type: "string", value: name },
              //   })),
              // );

              // remove any poll options that have no name
              // look through the localPollOptionNames object and remove any options that have no name
              let emptyOptions = Object.entries(localPollOptionNames).filter(
                ([optionEntity, optionName]) => {
                  optionName === "";
                },
              );
              console.log(emptyOptions);
            }}
          >
            Save <CheckTiny />
          </ButtonPrimary>
        </>
      ) : (
        <div className="flex justify-end gap-2">
          <EditPollOptionsButton state={pollState} setState={setPollState} />
          <Separator classname="h-6" />
          <PollStateToggle setPollState={setPollState} pollState={pollState} />
        </div>
      )}
    </div>
  );
};

const PollOption = (props: {
  entityID: string;
  pollEntity: string;
  localNameState: string | undefined;
  setLocalNameState: (
    s: (s: { [k: string]: string }) => { [k: string]: string },
  ) => void;
  state: "editing" | "voting" | "results";
  setState: (state: "editing" | "voting" | "results") => void;
  votes: number;
  totalVotes: number;
  winner: boolean;
}) => {
  let { rep } = useReplicache();
  let { mutate } = usePollData();

  let optionName = useEntity(props.entityID, "poll-option/name")?.data.value;
  useEffect(() => {
    props.setLocalNameState((s) => ({
      ...s,
      [props.entityID]: optionName || "",
    }));
  }, [optionName, props.setLocalNameState, props.entityID]);
  return props.state === "editing" ? (
    <div className="flex gap-2 items-center">
      <Input
        type="text"
        className="pollOptionInput w-full input-with-border"
        placeholder="Option here..."
        disabled={props.votes > 0}
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
        disabled={props.votes > 0}
        className="text-accent-contrast disabled:text-border"
        onMouseDown={() => {
          rep?.mutate.removePollOption({ optionEntity: props.entityID });
        }}
      >
        <CloseTiny />
      </button>
    </div>
  ) : optionName === "" ? null : props.state === "voting" ? (
    <div className="flex gap-2 items-center">
      <ButtonSecondary
        className={`pollOption grow max-w-full`}
        onClick={() => {
          props.setState("results");
          voteOnPoll(props.pollEntity, props.entityID);
          mutate();
        }}
      >
        {optionName}
      </ButtonSecondary>
    </div>
  ) : (
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

const AddPollOptionButton = (props: { entityID: string }) => {
  let { rep } = useReplicache();
  let permission_set = useEntitySetContext();
  let options = useEntity(props.entityID, "poll/options");
  return (
    <button
      className="pollAddOption w-fit flex gap-2 items-center justify-start text-sm text-accent-contrast"
      onClick={() => {
        rep?.mutate.addPollOption({
          pollEntity: props.entityID,
          pollOptionEntity: v7(),
          pollOptionName: "",
          permission_set: permission_set.set,
          factID: v7(),
        });
      }}
    >
      Add an Option
    </button>
  );
};

const EditPollOptionsButton = (props: {
  state: "editing" | "voting" | "results";
  setState: (state: "editing" | "voting" | "results") => void;
}) => {
  return (
    <button
      className="pollEditOptions w-fit flex gap-2 items-center justify-start text-sm text-accent-contrast"
      onClick={() => {
        props.setState("editing");
      }}
    >
      Edit Options{" "}
    </button>
  );
};

const PollStateToggle = (props: {
  setPollState: (pollState: "editing" | "voting" | "results") => void;
  pollState: "editing" | "voting" | "results";
}) => {
  return (
    <button
      className="text-sm text-accent-contrast sm:hover:underline"
      onMouseDown={() => {
        props.setPollState(props.pollState === "voting" ? "results" : "voting");
      }}
    >
      {props.pollState === "voting" ? "See Results" : "Back to Poll"}
    </button>
  );
};
