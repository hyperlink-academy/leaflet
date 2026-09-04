export const InteractionButton = (props: {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  onMouseEnter?: React.MouseEventHandler<HTMLButtonElement>;
  onTouchStart?: React.TouchEventHandler<HTMLButtonElement>;
  ariaLabel: string;
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={`interactionButton relative flex gap-1 items-center ${props.className}`}
    >
      {/* The overlay covers the row, so children can only be hovered on their
          own when they sit above it (z-10); everything under it highlights off
          `peer-hover` instead. Callers own those hover styles. */}
      <button
        onClick={props.onClick}
        onMouseEnter={props.onMouseEnter}
        onTouchStart={props.onTouchStart}
        className="peer absolute inset-0 z-0"
        aria-label={props.ariaLabel}
      />
      {props.children}
    </div>
  );
};

export const LargeInteractionButton = (props: {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  onMouseEnter?: React.MouseEventHandler<HTMLButtonElement>;
  onTouchStart?: React.TouchEventHandler<HTMLButtonElement>;
  ariaLabel: string;
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={`largeInteractionButton relative flex gap-1 items-center text-accent-contrast py-1 pl-2 pr-3 rounded-full border border-accent-contrast shrink-0 hover:bg-accent-1 hover:text-accent-2 ${props.className}`}
    >
      <button
        onClick={props.onClick}
        onMouseEnter={props.onMouseEnter}
        onTouchStart={props.onTouchStart}
        className="absolute inset-0"
        aria-label={props.ariaLabel}
      />
      {props.children}
    </div>
  );
};
