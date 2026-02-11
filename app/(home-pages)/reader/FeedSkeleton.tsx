export function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex flex-col gap-3 p-2">
          <div className="h-4 bg-border-light rounded w-1/3" />
          <div className="h-3 bg-border-light rounded w-2/3" />
          <div className="h-3 bg-border-light rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}
