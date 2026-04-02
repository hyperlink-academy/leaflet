export function EmptyState({
  title,
  description,
  className,
  container = "frosted",
  children,
}: {
  title?: string;
  description?: string;
  className?: string;
  container?: "frosted" | "opaque" | "none";
  children?: React.ReactNode;
}) {
  const containerClass =
    container === "frosted"
      ? "frosted-container"
      : container === "opaque"
        ? "opaque-container"
        : "";

  return (
    <div
      className={`w-full text-sm flex flex-col gap-1 italic text-tertiary text-center sm:p-4 p-3 ${containerClass} ${className ?? ""}`}
    >
      {title && <div className="text-base font-bold">{title}</div>}
      {description && <span>{description}</span>}
      {children}
    </div>
  );
}
