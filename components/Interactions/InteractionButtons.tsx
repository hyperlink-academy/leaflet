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
      className={`interactionButton relative flex gap-1 items-center hover:text-accent-contrast ${props.className}`}
    >
      <button
        onClick={props.onClick}
        onMouseEnter={props.onMouseEnter}
        onTouchStart={props.onTouchStart}
        className="absolute inset-0 z-0"
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
      className={`largeInteractionButton relative flex gap-1 items-center text-accent-contrast py-1 px-2 rounded-full border border-accent-contrast shrink-0 sm:hover:bg-accent-1 hover:text-accent-2 ${props.className}`}
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
