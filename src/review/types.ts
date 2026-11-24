// The review system judges accounts: one person or operator, with every
// Leaflet-made document they have published, in a publication or not.

export type Queryable = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: any[] }>;
};

export type ReviewLink = { url: string; domain: string };

export type ReviewDocument = {
  uri: string;
  publication: string | null;
  title: string | null;
  description: string | null;
  text: string;
  // Length of the full text; `text` itself is capped at load.
  chars: number;
  links: ReviewLink[];
  publishedAt: string | null;
};

export type ReviewPublication = {
  uri: string;
  name: string;
  description: string | null;
  url: string | null;
};

export type ReviewProfile = {
  handle: string | null;
  displayName: string | null;
  bio: string | null;
  createdAt: string | null;
  followers: number;
  follows: number;
  posts: number;
};

export type AccountBundle = {
  did: string;
  // Null when the profile lookup failed or was skipped, not when it is empty.
  profile: ReviewProfile | null;
  publications: ReviewPublication[];
  documents: ReviewDocument[];
  humanLabel: "spam" | "legit" | null;
};

export type SignalValue = number | string | boolean | null;

export type SignalResult = {
  value: SignalValue;
  evidence?: Record<string, unknown>;
};

export type SignalContext = {
  // Where document_links and review_subjects live.
  db: Queryable;
  now: Date;
};

export type Signal = {
  id: string;
  version: number;
  // Costly signals run only when a policy rule asks for them.
  cost: "cheap" | "costly";
  compute: (
    account: AccountBundle,
    ctx: SignalContext,
    prior: Record<string, SignalResult>,
  ) => Promise<SignalResult>;
};

export type ProposedStatus = "pending" | "cleared" | "held" | "spam";

export type Decision = {
  status: ProposedStatus;
  rule: string;
  needsHuman: boolean;
};
