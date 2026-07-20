import { formatDayTick } from "./dates";

export const ChartTooltip = (props: {
  active?: boolean;
  payload?: ReadonlyArray<{ value?: number | string; dataKey?: string | number }>;
  label?: string | number;
  unit: string;
}) => {
  if (!props.active || !props.payload?.length) return null;
  let value = props.payload.find((p) => p.value != null)?.value;
  if (value == null) return null;
  return (
    <div className="light-container px-2 py-1 text-sm shadow-sm">
      <div className="text-tertiary text-xs">
        {formatDayTick(String(props.label))}
      </div>
      <div>
        {Number(value).toLocaleString()} {props.unit}
      </div>
    </div>
  );
};
