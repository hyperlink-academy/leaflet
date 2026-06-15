export function PlaceholderText(size: "sm" | "md" | "lg", width?: string) {
  return (
    <div
      style={{ width: width ? width : "100%" }}
      className={`

        ${
          size === "sm"
            ? "h-1.5! shrink bg-border-light"
            : size === "lg"
              ? "h-3 bg-border"
              : "w-full h-1.5 bg-border"
        }
        rounded-[2px]`}
    />
  );
}

export const SmallIcon = ({ selected }: { selected: boolean }) => {
  return (
    <div
      className={`flex gap-2 p-2 w-full overflow-hidden opaque-container border-tertiary! ${selected && "border-accent-contrast!"}`}
    >
      <div className="flex flex-col gap-1 grow min-w-0">
        {PlaceholderText("lg")}
        <div className="flex justify-between mt-1 w-full">
          {PlaceholderText("sm", "60%")}
        </div>
      </div>
    </div>
  );
};

export const MedIcon = ({ selected }: { selected: boolean }) => {
  return (
    <div
      className={`flex opaque-container border-tertiary! overflow-hidden w-full ${selected && "border-accent-contrast!"}`}
    >
      <div className="flex flex-col gap-1 p-2 grow min-w-0">
        {PlaceholderText("lg")}
        {PlaceholderText("md")}
        {PlaceholderText("md", "80%")}
        <div className="flex justify-between mt-2 w-full">
          {PlaceholderText("sm", "60%")}
        </div>
      </div>
      <div
        className="sm:aspect 1/2 aspect-square h-[68px] bg-border border-l border-border shrink-0 bg-cover bg-center"
        style={{
          backgroundImage: "url(/imagePlaceholder.png)",
          backgroundBlendMode: "hard-light",
        }}
      />
    </div>
  );
};

export const LargeIcon = ({ selected }: { selected: boolean }) => {
  return (
    <div
      className={`flex flex-col w-full gap-1 opaque-container border-tertiary! overflow-hidden ${selected && "border-accent-contrast!"}`}
    >
      <div
        className="w-full aspect-4/1 sm:aspect-2/1 bg-border bg-cover bg-center border-b border-border"
        style={{
          backgroundImage: "url(/imagePlaceholder.png)",
          backgroundBlendMode: "hard-light",
        }}
      />

      <div className="flex flex-col gap-1 p-2 pt-0.5!">
        {PlaceholderText("lg")}
        {PlaceholderText("md")}
        {PlaceholderText("md", "80%")}
        <div className="flex justify-between mt-2 w-full">
          {PlaceholderText("sm", "60%")}
        </div>
      </div>
    </div>
  );
};
