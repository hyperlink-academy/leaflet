"use client";
import { CloseTiny } from "components/Icons/CloseTiny";
import { Input } from "components/Input";
import { useState, useRef } from "react";
import { Popover } from "components/Popover";

const Tags = [
  "dogs",
  "cats",
  "fruit enthusiam",
  "at proto",
  "events in nyc",
  "react devs",
  "fanfic",
  "pokemon",
];

export const PublishTags = (props: {}) => {
  let [selectedTags, setSelectedTags] = useState<string[]>([]);
  return (
    <div className="flex flex-col ">
      <h4>Add Global Tags</h4>
      <div className="relative flex flex-col gap-1 opaque-container p-2 ">
        <TagSearchInput
          selectedTags={selectedTags}
          setSelectedTags={setSelectedTags}
        />
      </div>
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {selectedTags.map((tag) => (
            <Tag
              name={tag}
              selected
              onSelect={() => {
                setSelectedTags(selectedTags.filter((t) => t !== tag));
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Tag = (props: {
  name: string;
  selected?: boolean;
  onSelect?: (tag: string) => void;
}) => {
  return (
    <div
      className={`tag flex gap-1 items-center text-xs px-1 py-0.5 rounded-md border ${props.selected ? "bg-accent-1 text-accent-2 border-accent-1 font-bold" : "bg-bg-page text-tertiary border-border"}`}
    >
      {props.name}{" "}
      {props.selected ? (
        <button
          type="button"
          onClick={() => (props.onSelect ? props.onSelect(props.name) : null)}
        >
          <CloseTiny className="scale-75" />
        </button>
      ) : null}
    </div>
  );
};

const TagSearchInput = (props: {
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
}) => {
  let [tagInputValue, setTagInputValue] = useState("");
  let [isOpen, setIsOpen] = useState(false);
  let [highlightedIndex, setHighlightedIndex] = useState(0);
  let inputWidth = document.getElementById("tag-search-input")?.clientWidth;

  const filteredTags = Tags.filter(
    (tag) =>
      tag.toLowerCase().includes(tagInputValue.toLowerCase()) &&
      !props.selectedTags.includes(tag),
  );

  function closeTagResults() {
    setIsOpen(false);
    setHighlightedIndex(0);
    document.getElementById("tag-search-input")?.focus();
  }
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredTags.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectTag(filteredTags[highlightedIndex]);
      closeTagResults();
      setTagInputValue("");
    } else if (e.key === "Escape") {
      closeTagResults();
    }
  };

  function selectTag(tag: string) {
    console.log("selected " + tag);
    props.setSelectedTags([...props.selectedTags, tag]);
    closeTagResults();
    setTagInputValue("");
  }
  return (
    <>
      <Input
        className="input-with-border grow w-full"
        id="tag-search-input"
        value={tagInputValue}
        onChange={(e) => {
          setTagInputValue(e.target.value);
          setIsOpen(true);
          setHighlightedIndex(0);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          setIsOpen(true);
        }}
      />
      {/*onBlur={() => {
        setIsOpen(false);
        setHighlightedIndex(0);
      }}*/}
      <Popover
        open={isOpen}
        onOpenChange={setIsOpen}
        className="!w-full !px-0 !py-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
        trigger={<div className="absolute left-0 right-0"></div>}
      >
        <RecentTags />
        <div style={{ width: `${inputWidth}px` }}>
          {filteredTags.map((tag, index) => (
            <TagResult
              key={tag}
              index={index}
              tag={tag}
              highlighted={index === highlightedIndex}
              setHighlightedIndex={setHighlightedIndex}
              onSelect={() => selectTag(tag)}
            />
          ))}
        </div>
      </Popover>
    </>
  );
};

const TagResult = (props: {
  tag: string;
  onSelect: () => void;
  index: number;
  highlighted: boolean;
  setHighlightedIndex: (i: number) => void;
}) => {
  return (
    <button
      className={`w-full ${props.highlighted ? "bg-test" : "bg-test-blue"}`}
      onSelect={() => props.onSelect()}
      onMouseEnter={(e) => props.setHighlightedIndex(props.index)}
    >
      {props.tag}
    </button>
  );
};

const RecentTags = () => {
  return (
    <div className="flex flex-wrap gap-2">
      <div className="text-sm ">Recent</div>

      <Tag name="this" />
      <Tag name="is a" />
      <Tag name="recently used" />
      <Tag name="tag" />
    </div>
  );
};
