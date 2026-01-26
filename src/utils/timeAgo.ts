export function timeAgo(
  timestamp: string,
  options?: { compact?: boolean },
): string {
  const { compact } = options ?? {};
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (compact) {
    if (diffYears > 0) {
      return `${diffYears}y`;
    } else if (diffMonths > 0) {
      return `${diffMonths}mo`;
    } else if (diffWeeks > 0) {
      return `${diffWeeks}w`;
    } else if (diffDays > 0) {
      return `${diffDays}d`;
    } else if (diffHours > 0) {
      return `${diffHours}h`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m`;
    } else {
      return "now";
    }
  }

  if (diffYears > 0) {
    return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
  } else if (diffMonths > 0) {
    return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
  } else if (diffWeeks > 0) {
    return `${diffWeeks} week${diffWeeks === 1 ? "" : "s"} ago`;
  } else if (diffDays > 0) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  } else {
    return "just now";
  }
}
