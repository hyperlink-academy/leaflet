import { ChevronProps, DayPicker as ReactDayPicker } from "react-day-picker";
import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";

const CustomChevron = (props: ChevronProps) => {
  return (
    <div {...props} className="w-full pointer-events-none">
      <ArrowRightTiny />
    </div>
  );
};

interface DayPickerProps {
  selected: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  disabled?: (date: Date) => boolean;
  toDate?: Date;
}

export const DayPicker = ({
  selected,
  onSelect,
  disabled,
  toDate,
}: DayPickerProps) => {
  return (
    <ReactDayPicker
      components={{
        Chevron: (props: ChevronProps) => <CustomChevron {...props} />,
      }}
      classNames={{
        months: "relative",
        month_caption:
          "font-bold text-center w-full bg-border-light mb-2 py-1 rounded-md",
        button_next:
          "absolute right-0 top-1 p-1 text-secondary hover:text-accent-contrast flex align-center",
        button_previous:
          "absolute left-0 top-1 p-1 text-secondary hover:text-accent-contrast rotate-180 flex align-center",
        chevron: "text-inherit",
        month_grid: "w-full table-fixed",
        weekdays: "text-secondary text-sm",
        selected: "bg-accent-1! text-accent-2 rounded-md font-bold",
        day: "h-[34px] text-center rounded-md sm:hover:bg-border-light",
        outside: "text-tertiary",
        today: "font-bold",
        disabled: "text-border cursor-not-allowed hover:bg-transparent!",
      }}
      mode="single"
      selected={selected}
      onSelect={onSelect}
      disabled={disabled}
      toDate={toDate}
    />
  );
};
