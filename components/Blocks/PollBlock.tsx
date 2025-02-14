import { useUIState } from "src/useUIState";
import { BlockProps } from "./Block";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { useEffect, useState } from "react";
import { Input } from "components/Input";
import { CheckTiny, CloseTiny, InfoSmall } from "components/Icons";
import { Separator } from "components/Layout";
import { useEntitySetContext } from "components/EntitySetProvider";
import { theme } from "tailwind.config";

export const PollBlock = (props: BlockProps) => {
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  let { permissions } = useEntitySetContext();

  let [pollState, setPollState] = useState<"editing" | "voting" | "results">(
    !permissions.write ? "voting" : "editing",
  );

  let [pollOptions, setPollOptions] = useState<
    { value: string; votes: number }[]
  >([
    { value: "hello", votes: 2 },
    { value: "hi", votes: 4 },
  ]);

  let totalVotes = pollOptions.reduce((sum, option) => sum + option.votes, 0);

  let highestVotes = Math.max(...pollOptions.map((option) => option.votes));
  let winningIndexes = pollOptions.reduce<number[]>(
    (indexes, option, index) => {
      if (option.votes === highestVotes) indexes.push(index);
      return indexes;
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
      {(pollOptions.every((option) => option.value === "") ||
        pollOptions.length === 0) &&
        pollState !== "editing" && (
          <div className="text-center italic text-tertiary text-sm">
            no options yet...
          </div>
        )}

      {pollOptions.map((option, index) => (
        <PollOption
          key={index}
          state={pollState}
          setState={setPollState}
          optionName={option.value}
          setOptionName={(newValue) => {
            setPollOptions((oldOptions) => {
              let newOptions = [...oldOptions];
              newOptions[index] = {
                value: newValue,
                votes: oldOptions[index].votes,
              };
              return newOptions;
            });
          }}
          votes={option.votes}
          setVotes={(newVotes) => {
            setPollOptions((oldOptions) => {
              let newOptions = [...oldOptions];
              newOptions[index] = {
                value: oldOptions[index].value,
                votes: newVotes,
              };
              return newOptions;
            });
          }}
          totalVotes={totalVotes}
          winner={winningIndexes.includes(index)}
          removeOption={() => {
            setPollOptions((oldOptions) => {
              let newOptions = [...oldOptions];
              newOptions.splice(index, 1);
              return newOptions;
            });
          }}
        />
      ))}
      {!permissions.write ? null : pollState === "editing" ? (
        <>
          <AddPollOptionButton
            addPollOption={() => {
              setPollOptions([...pollOptions, { value: "", votes: 0 }]);
            }}
          />
          <hr className="border-border" />
          <ButtonPrimary
            className="place-self-end"
            onMouseDown={() => {
              setPollState("voting");
              // TODO: Currently, the options are updated onChange in thier inputs in PollOption.
              // However, they should instead be updated when this save button is clicked!
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
  state: "editing" | "voting" | "results";
  setState: (state: "editing" | "voting" | "results") => void;
  optionName: string;
  setOptionName: (optionName: string) => void;
  votes: number;
  setVotes: (votes: number) => void;
  totalVotes: number;
  winner: boolean;
  removeOption: () => void;
}) => {
  let [inputValue, setInputValue] = useState(props.optionName);
  return props.state === "editing" ? (
    <div className="flex gap-2 items-center">
      <Input
        type="text"
        className="pollOptionInput w-full input-with-border"
        placeholder="Option here..."
        disabled={props.votes > 0}
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          props.setOptionName(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Backspace" && !e.currentTarget.value) {
            e.preventDefault();
            props.removeOption();
          }
        }}
      />

      <button
        disabled={props.votes > 0}
        className="text-accent-contrast disabled:text-border"
        onMouseDown={() => {
          props.removeOption();
        }}
      >
        <CloseTiny />
      </button>
    </div>
  ) : props.optionName === "" ? null : props.state === "voting" ? (
    <div className="flex gap-2 items-center">
      <ButtonSecondary
        className={`pollOption grow max-w-full`}
        onClick={() => {
          props.setState("results");
          props.setVotes(props.votes + 1);
        }}
      >
        {props.optionName}
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
        <div className="grow max-w-full truncate">{props.optionName}</div>
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

const AddPollOptionButton = (props: { addPollOption: () => void }) => {
  return (
    <button
      className="pollAddOption w-fit flex gap-2 items-center justify-start text-sm text-accent-contrast"
      onClick={() => {
        props.addPollOption();
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
