"use client";
import { Popover } from "components/Popover";
import { Checkbox } from "components/Checkbox";
import { Separator } from "components/Layout";
import { CloseTiny } from "components/Icons/CloseTiny";
import { Input } from "components/Input";
import { SearchTiny } from "components/Icons/SearchTiny";
import { SortSmall } from "components/Icons/SortSmall";
import {
  DashboardState,
  useDashboardState,
  useSetDashboardState,
} from "./dashboardState";

export const PageSearch = (props: {
  searchValue: string;
  setSearchValueAction: (searchValue: string) => void;
  hasBackgroundImage: boolean;
  defaultDisplay: Exclude<DashboardState["display"], undefined>;
  hasPubs?: boolean;
  hasArchived?: boolean;
}) => {
  let { display, sort } = useDashboardState();
  display = display || props.defaultDisplay;
  let setState = useSetDashboardState();

  return (
    <div className="searchControls w-full flex sm:gap-4 gap-2">
      <SearchInput
        searchValue={props.searchValue}
        setSearchValue={props.setSearchValueAction}
        hasBackgroundImage={props.hasBackgroundImage}
      />
      <div className="desktopSearchControls hidden sm:flex gap-2 w-max shrink-0 items-center text-sm text-tertiary">
        <DisplayToggle setState={setState} display={display} />
        <Separator classname="h-4 min-h-4!" />
        {props.hasPubs || props.hasArchived ? (
          <>
            <FilterOptions
              hasPubs={props.hasPubs ?? false}
              hasArchived={props.hasArchived ?? false}
            />
            <Separator classname="h-4 min-h-4!" />{" "}
          </>
        ) : null}
        <SortToggle setState={setState} sort={sort} />
      </div>
      <div className="flex sm:hidden w-max shrink-0 items-center text-sm text-tertiary">
        <MobileSearchControls
          display={display}
          sort={sort}
          setState={setState}
          hasPubs={props.hasPubs}
          hasArchived={props.hasArchived}
        />
      </div>
    </div>
  );
};

const SortToggle = (props: {
  setState: (partial: Partial<DashboardState>) => Promise<void>;
  sort: string | undefined;
}) => {
  return (
    <button
      onClick={() =>
        props.setState({
          sort: props.sort === "created" ? "alphabetical" : "created",
        })
      }
    >
      Sort: {props.sort === "created" ? "Created On" : "A to Z"}
    </button>
  );
};

const DisplayToggle = (props: {
  setState: (partial: Partial<DashboardState>) => Promise<void>;
  display: string | undefined;
}) => {
  return (
    <button
      onClick={() => {
        props.setState({
          display: props.display === "list" ? "grid" : "list",
        });
      }}
    >
      {props.display === "list" ? "List" : "Grid"}
    </button>
  );
};

const FilterCheckboxes = (props: {
  hasPubs: boolean;
  hasArchived: boolean;
}) => {
  let { filter } = useDashboardState();
  let setState = useSetDashboardState();
  let filterCount = Object.values(filter).filter(Boolean).length;

  return (
    <>
      {props.hasPubs && (
        <>
          <Checkbox
            small
            checked={filter.drafts}
            onChange={(e) =>
              setState({ filter: { ...filter, drafts: !!e.target.checked } })
            }
          >
            Drafts
          </Checkbox>
          <Checkbox
            small
            checked={filter.published}
            onChange={(e) =>
              setState({
                filter: { ...filter, published: !!e.target.checked },
              })
            }
          >
            Published
          </Checkbox>
        </>
      )}
      {props.hasArchived && (
        <Checkbox
          small
          checked={filter.archived}
          onChange={(e) =>
            setState({ filter: { ...filter, archived: !!e.target.checked } })
          }
        >
          Archived
        </Checkbox>
      )}
      <Checkbox
        small
        checked={filter.docs}
        onChange={(e) =>
          setState({ filter: { ...filter, docs: !!e.target.checked } })
        }
      >
        Docs
      </Checkbox>

      <hr className="border-border-light border-dashed mt-1 mb-0.5" />
      <button
        className="flex gap-1 items-center -mx-[2px] text-tertiary"
        onClick={() =>
          setState({
            filter: {
              docs: false,
              published: false,
              drafts: false,
              archived: false,
            },
          })
        }
      >
        <CloseTiny className="scale-75" /> Clear
      </button>
    </>
  );
};

const FilterOptions = (props: { hasPubs: boolean; hasArchived: boolean }) => {
  let { filter } = useDashboardState();
  let filterCount = Object.values(filter).filter(Boolean).length;

  return (
    <Popover
      className="text-sm px-2! py-1!"
      trigger={<div>Filter {filterCount > 0 && `(${filterCount})`}</div>}
    >
      <FilterCheckboxes
        hasPubs={props.hasPubs}
        hasArchived={props.hasArchived}
      />
    </Popover>
  );
};

const MobileSearchControls = (props: {
  display: string;
  sort: string | undefined;
  setState: (partial: Partial<DashboardState>) => Promise<void>;
  hasPubs?: boolean;
  hasArchived?: boolean;
}) => {
  let { filter } = useDashboardState();
  let filterCount = Object.values(filter).filter(Boolean).length;

  return (
    <Popover
      align="end"
      className={`text-sm w-48`}
      trigger={
        <div
          className={`${filterCount > 0 ? "text-accent-2 bg-accent-1 rounded-md" : "text-secondary"}`}
        >
          <SortSmall />
        </div>
      }
    >
      <button
        className="w-full flex justify-between font-bold"
        onClick={() =>
          props.setState({
            display: props.display === "list" ? "grid" : "list",
          })
        }
      >
        <div className="text-sm text-tertiary font-normal uppercase">
          Display
        </div>
        {props.display === "list" ? "List" : "Grid"}
      </button>
      <hr className="border-border-light my-1" />
      <button
        className="w-full flex justify-between font-bold"
        onClick={() =>
          props.setState({
            sort: props.sort === "created" ? "alphabetical" : "created",
          })
        }
      >
        <div className="text-sm text-tertiary font-normal uppercase">Sort</div>
        {props.sort === "created" ? "Created On" : "A to Z"}
      </button>
      {(props.hasPubs || props.hasArchived) && (
        <>
          <hr className="border-border-light my-1" />
          <div className="text-sm text-tertiary font-normal uppercase">
            Filter
          </div>
          <FilterCheckboxes
            hasPubs={props.hasPubs ?? false}
            hasArchived={props.hasArchived ?? false}
          />
        </>
      )}
    </Popover>
  );
};

const SearchInput = (props: {
  searchValue: string;
  setSearchValue: (searchValue: string) => void;
  hasBackgroundImage: boolean;
}) => {
  return (
    <div className="relative grow shrink-0">
      <Input
        className={`dashboardSearchInput
          appearance-none! outline-hidden!
          w-full min-w-0 text-primary relative pl-7 pr-1 -my-px
          border rounded-md border-border-light focus-within:border-border
          bg-transparent focus-within:bg-bg-page`}
        type="text"
        id="pubName"
        size={1}
        placeholder="search..."
        value={props.searchValue}
        onChange={(e) => {
          props.setSearchValue(e.currentTarget.value);
        }}
      />
      <div className="absolute left-[6px] top-[4px] text-secondary">
        <SearchTiny />
      </div>
    </div>
  );
};
