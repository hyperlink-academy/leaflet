"use client";
import { CloseTiny } from "components/Icons/CloseTiny";
import { Input } from "components/Input";
import { useState, useRef } from "react";
import { useDebouncedEffect } from "src/hooks/useDebouncedEffect";
import { Popover } from "components/Popover";
import Link from "next/link";
import { searchTags, type TagSearchResult } from "actions/searchTags";

export const Tag = (props: {
  name: string;
  selected?: boolean;
  onDelete?: (tag: string) => void;
  className?: string;
}) => {
  return (
    <div
      className={`tag flex items-center text-xs  rounded-md border ${props.selected ? "bg-accent-1  border-accent-1 font-bold" : "bg-bg-page border-border"} ${props.className}`}
    >
      <Link
        href={`https://leaflet.pub/tag/${encodeURIComponent(props.name)}`}
        className={`px-1 py-0.5 hover:no-underline! ${props.selected ? "text-accent-2" : "text-tertiary"}`}
      >
        {props.name}{" "}
      </Link>
      {props.selected ? (
        <button
          type="button"
          onClick={() => (props.onDelete ? props.onDelete(props.name) : null)}
        >
          <CloseTiny className="scale-75 pr-1 text-accent-2" />
        </button>
      ) : null}
    </div>
  );
};

export const TagSelector = (props: {
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
}) => {
  return (
    <div className="flex flex-col gap-2 text-primary">
      <TagSearchInput
        selectedTags={props.selectedTags}
        setSelectedTags={props.setSelectedTags}
      />
      {props.selectedTags.length > 0 ? (
        <div className="flex flex-wrap gap-2 ">
          {props.selectedTags.map((tag) => (
            <Tag
              key={tag}
              name={tag}
              selected
              onDelete={() => {
                props.setSelectedTags(
                  props.selectedTags.filter((t) => t !== tag),
                );
              }}
            />
          ))}
        </div>
      ) : (
        <div className="text-tertiary italic text-sm h-6">no tags selected</div>
      )}
    </div>
  );
};

export const TagSearchInput = (props: {
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
}) => {
  let [tagInputValue, setTagInputValue] = useState("");
  let [isOpen, setIsOpen] = useState(false);
  let [highlightedIndex, setHighlightedIndex] = useState(0);
  let [searchResults, setSearchResults] = useState<TagSearchResult[]>([]);
  let [isSearching, setIsSearching] = useState(false);

  const placeholderInputRef = useRef<HTMLButtonElement | null>(null);

  let inputWidth = placeholderInputRef.current?.clientWidth;

  // Fetch tags whenever the input value changes
  useDebouncedEffect(
    async () => {
      setIsSearching(true);
      const results = await searchTags(tagInputValue);
      if (results) {
        setSearchResults(results);
      }
      setIsSearching(false);
    },
    300,
    [tagInputValue],
  );

  const filteredTags = searchResults
    .filter((tag) => !props.selectedTags.includes(tag.name))
    .filter((tag) =>
      tag.name.toLowerCase().includes(tagInputValue.toLowerCase()),
    );

  const showResults = tagInputValue.length >= 3;

  function clearTagInput() {
    setHighlightedIndex(0);
    setTagInputValue("");
  }

  function selectTag(tag: string) {
    // Normalize tag to lowercase for consistent storage and querying
    const normalizedTag = tag.toLowerCase();
    console.log("selected " + normalizedTag);
    props.setSelectedTags([...props.selectedTags, normalizedTag]);
    clearTagInput();
  }

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredTags.length ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectTag(
        userInputResult
          ? highlightedIndex === 0
            ? tagInputValue
            : filteredTags[highlightedIndex - 1].name
          : filteredTags[highlightedIndex].name,
      );
      clearTagInput();
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const userInputResult =
    showResults &&
    tagInputValue !== "" &&
    !filteredTags.some((tag) => tag.name === tagInputValue);

  return (
    <div className="relative">
      <Input
        className="input-with-border grow w-full outline-none! lowercase"
        id="placeholder-tag-search-input"
        value={tagInputValue}
        placeholder="search tags…"
        onChange={(e) => {
          setTagInputValue(e.target.value.toLowerCase());
          setIsOpen(true);
          setHighlightedIndex(0);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          setIsOpen(true);
          document.getElementById("tag-search-input")?.focus();
        }}
      />
      <Popover
        open={isOpen}
        onOpenChange={() => {
          setIsOpen(!isOpen);
          if (!isOpen)
            setTimeout(() => {
              document.getElementById("tag-search-input")?.focus();
            }, 100);
        }}
        className="w-full p-2! min-w-xs text-primary"
        sideOffset={-39}
        onOpenAutoFocus={(e) => e.preventDefault()}
        asChild
        trigger={
          <button
            ref={placeholderInputRef}
            className="absolute left-0 top-0 right-0 h-[30px]"
          ></button>
        }
        noArrow
      >
        <div className="" style={{ width: `${inputWidth}px` }}>
          <Input
            className="input-with-border grow w-full mb-2"
            id="tag-search-input"
            placeholder="search tags…"
            value={tagInputValue}
            onChange={(e) => {
              setTagInputValue(e.target.value.toLowerCase());
              setIsOpen(true);
              setHighlightedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setIsOpen(true);
            }}
          />
          {props.selectedTags.length > 0 ? (
            <div className="flex flex-wrap gap-2 pb-[6px]">
              {props.selectedTags.map((tag) => (
                <Tag
                  key={tag}
                  name={tag}
                  selected
                  onDelete={() => {
                    props.setSelectedTags(
                      props.selectedTags.filter((t) => t !== tag),
                    );
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-tertiary italic text-sm h-6">
              no tags selected
            </div>
          )}
          <hr className=" mb-[2px] border-border-light" />

          {showResults ? (
            <>
              {userInputResult && (
                <TagResult
                  key={"userInput"}
                  index={0}
                  name={tagInputValue}
                  tagged={0}
                  highlighted={0 === highlightedIndex}
                  setHighlightedIndex={setHighlightedIndex}
                  onSelect={() => {
                    selectTag(tagInputValue);
                  }}
                />
              )}
              {filteredTags.map((tag, i) => (
                <TagResult
                  key={tag.name}
                  index={userInputResult ? i + 1 : i}
                  name={tag.name}
                  tagged={tag.document_count}
                  highlighted={
                    (userInputResult ? i + 1 : i) === highlightedIndex
                  }
                  setHighlightedIndex={setHighlightedIndex}
                  onSelect={() => {
                    selectTag(tag.name);
                  }}
                />
              ))}
            </>
          ) : (
            <div className="text-tertiary italic text-sm py-1">
              type at least 3 characters to search
            </div>
          )}
        </div>
      </Popover>
    </div>
  );
};

const TagResult = (props: {
  name: string;
  tagged: number;
  onSelect: () => void;
  index: number;
  highlighted: boolean;
  setHighlightedIndex: (i: number) => void;
}) => {
  return (
    <div className="-mx-1">
      <button
        className={`w-full flex justify-between items-center text-left pr-1 pl-[6px]   py-0.5 rounded-md ${props.highlighted ? "bg-border-light" : ""}`}
        onSelect={(e) => {
          e.preventDefault();
          props.onSelect();
        }}
        onClick={(e) => {
          e.preventDefault();
          props.onSelect();
        }}
        onMouseEnter={(e) => props.setHighlightedIndex(props.index)}
      >
        {props.name}
        <div className="text-tertiary text-sm"> {props.tagged}</div>
      </button>
    </div>
  );
};
