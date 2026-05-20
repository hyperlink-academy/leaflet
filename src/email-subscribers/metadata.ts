// Schema for the `metadata` jsonb column on `publication_email_subscribers`.
//
// The column is nullable — most rows have no metadata at all (organic
// signups). Within each variant, only the `source` discriminator is
// required; every other field is optional because different writers
// populate different subsets.

export type CsvImportProvenance = {
  source: "csv_import";
  imported_at?: string;
  // Other CSV columns that the import script didn't consume directly
  // (e.g. ip_address, signup_source) — kept verbatim so we don't lose
  // information from the source list. The subscription date is not
  // stored here; it lives on `created_at`/`confirmed_at`.
  csv_columns?: Record<string, string>;
};

// Discriminated union of known subscriber-row metadata shapes. Extend as
// new sources start writing the column.
export type SubscriberMetadata = CsvImportProvenance;

// Column-level type — most rows are null.
export type SubscriberMetadataColumn = SubscriberMetadata | null;
