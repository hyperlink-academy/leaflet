export function CharacterCounter(props: { count: number; limit: number }) {
  const remaining = props.limit - props.count;
  const over = props.count - props.limit;
  const isOver = over > 0;

  const radius = 8;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(props.count / props.limit, 1);

  return (
    <div
      className={`flex items-center gap-1 text-xs italic ${
        isOver ? "text-accent-contrast font-bold" : "text-tertiary"
      }`}
    >
      <span>{isOver ? over : remaining}</span>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        className={`text-accent-contrast ${isOver ? "" : ""}`}
      >
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="opacity-20"
        />
        {isOver ? (
          <text
            x="12"
            y="11.5"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="11"
            fontWeight="bold"
            fill="currentColor"
          >
            !
          </text>
        ) : (
          <circle
            cx="12"
            cy="12"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            transform="rotate(-90 12 12)"
          />
        )}
      </svg>
    </div>
  );
}
