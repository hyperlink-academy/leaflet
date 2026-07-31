"use client";

import React, { useState } from "react";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { Input } from "components/Input";
import { DotLoader } from "components/utils/DotLoader";
import { useToaster } from "components/Toast";
import {
  analyzeCsv,
  type CsvAnalysis,
  type ImportState,
  type ImportTotals,
} from "src/email-subscribers/import";
import {
  searchPublications,
  dryRunEmailImport,
  runEmailImport,
  type AdminPublicationSearchResult,
  type AdminImportError,
  type ImportPreview,
} from "actions/admin/importSubscribers";

const ERROR_MESSAGES: Record<AdminImportError, string> = {
  unauthorized: "You're not allowed to do that.",
  invalid_input: "That input doesn't look right.",
  publication_not_found: "That publication doesn't exist.",
  database_error: "Something went wrong. Please try again.",
};

export function AdminImportSubscribers() {
  let toaster = useToaster();
  let [publication, setPublication] =
    useState<AdminPublicationSearchResult | null>(null);
  let [csv, setCsv] = useState<{
    name: string;
    text: string;
    analysis: CsvAnalysis;
    emailColumn: number;
    dateColumn: number | null;
  } | null>(null);
  let [state, setState] = useState<ImportState>("confirmed");
  let [preview, setPreview] = useState<ImportPreview | null>(null);
  let [previewing, setPreviewing] = useState(false);
  let [importing, setImporting] = useState(false);
  let [result, setResult] = useState<ImportTotals | null>(null);

  // Any change to the inputs invalidates a previously shown preview — the
  // confirm button only ever acts on a preview of the current inputs.
  let resetPreview = () => {
    setPreview(null);
    setResult(null);
  };

  let runPreview = async () => {
    if (!publication || !csv || previewing) return;
    setPreviewing(true);
    setResult(null);
    let res = await dryRunEmailImport({
      publicationUri: publication.uri,
      csvText: csv.text,
      state,
      columns: { emailColumn: csv.emailColumn, dateColumn: csv.dateColumn },
    });
    setPreviewing(false);
    if (!res.ok) {
      toaster({ type: "error", content: ERROR_MESSAGES[res.error] });
      return;
    }
    setPreview(res.value);
  };

  let runImport = async () => {
    if (!publication || !csv || !preview || importing) return;
    setImporting(true);
    let res = await runEmailImport({
      publicationUri: publication.uri,
      csvText: csv.text,
      state,
      columns: { emailColumn: csv.emailColumn, dateColumn: csv.dateColumn },
    });
    setImporting(false);
    if (!res.ok) {
      toaster({ type: "error", content: ERROR_MESSAGES[res.error] });
      return;
    }
    setPreview(null);
    setResult(res.value);
    toaster({
      type: "success",
      content: `Imported ${res.value.inserted + res.value.reactivated + res.value.unsubscribed} subscribers to ${publication.name}`,
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-8 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h2>Import Email Subscribers</h2>
        <div className="text-secondary leading-snug">
          Bulk-import a CSV of email addresses as subscribers to a publication.
          No confirmation email is sent — this is for migrating an existing,
          consented list, not for cold imports. Rows with opt-out signals (e.g.
          Ghost&apos;s <span className="font-mono">unsubscribed</span> /{" "}
          <span className="font-mono">undeliverable</span> subscriber types) are
          kept on file as unsubscribed.
        </div>
      </div>

      <PublicationPicker
        publication={publication}
        onChange={(p) => {
          setPublication(p);
          resetPreview();
        }}
      />

      <div className="flex flex-col gap-3">
        <h3>CSV file</h3>
        <div className="text-tertiary text-sm leading-snug">
          One email per line; a header row is auto-detected. A subscription
          date column backdates new subscriptions.
        </div>
        <input
          type="file"
          accept=".csv,text/csv,text/plain"
          onChange={async (e) => {
            let file = e.target.files?.[0];
            resetPreview();
            if (!file) {
              setCsv(null);
              return;
            }
            let text = await file.text();
            let analysis = analyzeCsv(text);
            setCsv({
              name: file.name,
              text,
              analysis,
              emailColumn: analysis.suggested.emailColumn,
              dateColumn: analysis.suggested.dateColumn,
            });
          }}
        />
        {csv && (
          <ColumnMapper
            analysis={csv.analysis}
            emailColumn={csv.emailColumn}
            dateColumn={csv.dateColumn}
            onChange={(emailColumn, dateColumn) => {
              setCsv((c) => c && { ...c, emailColumn, dateColumn });
              resetPreview();
            }}
          />
        )}
        <div className="flex flex-col gap-1">
          <StateRadio
            value="confirmed"
            current={state}
            onChange={(s) => {
              setState(s);
              resetPreview();
            }}
            label="Confirmed"
            description="Subscribers immediately receive newsletters."
          />
          <StateRadio
            value="pending"
            current={state}
            onChange={(s) => {
              setState(s);
              resetPreview();
            }}
            label="Pending"
            description="Subscribers won't receive newsletters until they confirm via the normal flow."
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3>Preview</h3>
        {!preview && !result && (
          <ButtonSecondary
            className="self-start"
            disabled={
              !publication ||
              !csv ||
              csv.analysis.dataRowCount === 0 ||
              previewing
            }
            onClick={runPreview}
          >
            {previewing ? <DotLoader /> : "Preview import (dry run)"}
          </ButtonSecondary>
        )}
        {preview && publication && csv && (
          <PreviewCard
            preview={preview}
            publication={publication}
            fileName={csv.name}
            state={state}
            importing={importing}
            onConfirm={runImport}
          />
        )}
        {result && <ResultCard totals={result} />}
      </div>
    </div>
  );
}

function ColumnMapper(props: {
  analysis: CsvAnalysis;
  emailColumn: number;
  dateColumn: number | null;
  onChange: (emailColumn: number, dateColumn: number | null) => void;
}) {
  let { analysis } = props;
  let columns = Array.from({ length: analysis.columnCount }, (_, i) => i);
  let columnLabel = (i: number) => {
    let name = analysis.headers?.[i]?.trim() || `Column ${i + 1}`;
    let sample = (analysis.sampleRow[i] ?? "").trim();
    if (sample.length > 40) sample = sample.slice(0, 40) + "…";
    return sample ? `${name} (e.g. ${sample})` : name;
  };

  if (analysis.dataRowCount === 0) {
    return (
      <div className="text-sm text-accent-1">
        No data rows found in this file.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 border border-border-light rounded-md p-3">
      <div className="text-xs text-tertiary">
        {analysis.dataRowCount} data row{analysis.dataRowCount === 1 ? "" : "s"}{" "}
        · {analysis.headers ? "header row detected" : "no header row"}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <span className="text-tertiary w-40 shrink-0">Email column</span>
        <select
          className="input-with-border py-1! grow min-w-0 truncate"
          value={props.emailColumn}
          onChange={(e) => {
            let emailColumn = Number(e.target.value);
            props.onChange(
              emailColumn,
              // The same column can't be both email and date.
              props.dateColumn === emailColumn ? null : props.dateColumn,
            );
          }}
        >
          {columns.map((i) => (
            <option key={i} value={i}>
              {columnLabel(i)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <span className="text-tertiary w-40 shrink-0">
          Subscription date column
        </span>
        <select
          className="input-with-border py-1! grow min-w-0 truncate"
          value={props.dateColumn ?? ""}
          onChange={(e) => {
            props.onChange(
              props.emailColumn,
              e.target.value === "" ? null : Number(e.target.value),
            );
          }}
        >
          <option value="">None (use import time)</option>
          {columns.map((i) => (
            <option key={i} value={i} disabled={i === props.emailColumn}>
              {columnLabel(i)}
            </option>
          ))}
        </select>
      </label>
      {analysis.headers && (
        <div className="text-xs text-tertiary leading-snug">
          Other columns are stored verbatim in each subscriber&apos;s import
          metadata. Opt-out signals (
          <span className="font-mono">subscriber_type</span>,{" "}
          <span className="font-mono">subscribed_to_emails</span>,{" "}
          <span className="font-mono">unsubscription_date</span>) are matched by
          header name automatically.
        </div>
      )}
    </div>
  );
}

function StateRadio(props: {
  value: ImportState;
  current: ImportState;
  onChange: (s: ImportState) => void;
  label: string;
  description: string;
}) {
  return (
    <label className="flex items-baseline gap-2 text-sm cursor-pointer">
      <input
        type="radio"
        name="import-state"
        checked={props.current === props.value}
        onChange={() => props.onChange(props.value)}
      />
      <span>
        <span className="font-bold text-primary">{props.label}</span>{" "}
        <span className="text-tertiary">{props.description}</span>
      </span>
    </label>
  );
}

function PublicationPicker(props: {
  publication: AdminPublicationSearchResult | null;
  onChange: (p: AdminPublicationSearchResult | null) => void;
}) {
  let toaster = useToaster();
  let [query, setQuery] = useState("");
  let [searching, setSearching] = useState(false);
  let [results, setResults] = useState<AdminPublicationSearchResult[] | null>(
    null,
  );

  let runSearch = async () => {
    let q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    let res = await searchPublications(q);
    setSearching(false);
    if (!res.ok) {
      toaster({ type: "error", content: ERROR_MESSAGES[res.error] });
      return;
    }
    setResults(res.value);
  };

  if (props.publication) {
    return (
      <div className="flex flex-col gap-3">
        <h3>Publication</h3>
        <div className="flex items-center gap-3 border border-border-light rounded-md px-3 py-2">
          <PublicationLabel publication={props.publication} />
          <ButtonSecondary compact onClick={() => props.onChange(null)}>
            Change
          </ButtonSecondary>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h3>Publication</h3>
      <div className="input-with-border py-0! flex items-center gap-2 w-full">
        <Input
          className="appearance-none! grow outline-none! min-w-0 py-1!"
          placeholder="name, handle.bsky.social, did:plc:…, or at:// uri"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              runSearch();
            }
          }}
        />
        <ButtonSecondary
          compact
          type="button"
          disabled={!query.trim() || searching}
          onClick={runSearch}
        >
          {searching ? <DotLoader /> : "Search"}
        </ButtonSecondary>
      </div>
      {results?.length === 0 && (
        <div className="text-tertiary text-sm">No publications found.</div>
      )}
      {results?.map((pub) => (
        <div
          key={pub.uri}
          className="flex items-center gap-3 border border-border-light rounded-md px-3 py-2"
        >
          <PublicationLabel publication={pub} />
          <ButtonPrimary compact onClick={() => props.onChange(pub)}>
            Select
          </ButtonPrimary>
        </div>
      ))}
    </div>
  );
}

function PublicationLabel(props: {
  publication: AdminPublicationSearchResult;
}) {
  let pub = props.publication;
  return (
    <div className="flex flex-col min-w-0 grow leading-snug">
      <div className="font-bold text-primary text-sm truncate">{pub.name}</div>
      <div className="text-tertiary text-xs flex flex-wrap gap-x-2">
        {pub.handle && <span>@{pub.handle}</span>}
        <span>
          {pub.subscriberCount} email subscriber
          {pub.subscriberCount === 1 ? "" : "s"}
        </span>
      </div>
      <div className="text-tertiary text-xs font-mono truncate">{pub.uri}</div>
    </div>
  );
}

function PreviewCard(props: {
  preview: ImportPreview;
  publication: AdminPublicationSearchResult;
  fileName: string;
  state: ImportState;
  importing: boolean;
  onConfirm: () => void;
}) {
  let { preview } = props;
  let changes =
    preview.totals.inserted +
    preview.totals.reactivated +
    preview.totals.unsubscribed;
  return (
    <div className="flex flex-col gap-3 border border-border-light rounded-md p-3">
      <div className="text-sm text-secondary leading-snug">
        Importing <span className="font-mono">{props.fileName}</span> into{" "}
        <span className="font-bold">{props.publication.name}</span> as{" "}
        <span className="font-bold">{props.state}</span>. No changes have been
        made yet.
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-sm self-start">
        <StatRow label="Rows in CSV" value={preview.rowCount} />
        <StatRow label="Valid unique emails" value={preview.valid} />
        <StatRow label="With subscription date" value={preview.withDate} />
        <StatRow label="New subscribers" value={preview.totals.inserted} bold />
        <StatRow
          label="Reactivated"
          value={preview.totals.reactivated}
          bold
        />
        <StatRow
          label="Imported as unsubscribed"
          value={preview.totals.unsubscribed}
          bold
        />
        <StatRow
          label="Linked to existing accounts"
          value={preview.totals.linked}
        />
        <StatRow label="Unchanged" value={preview.totals.unchanged} />
        <StatRow label="Invalid (skipped)" value={preview.invalid} />
      </div>
      {preview.invalidSamples.length > 0 && (
        <div className="text-xs text-tertiary">
          Invalid email samples:{" "}
          <span className="font-mono">{preview.invalidSamples.join(", ")}</span>
        </div>
      )}
      <div className="flex justify-end">
        <ButtonPrimary
          disabled={props.importing || changes === 0}
          onClick={props.onConfirm}
        >
          {props.importing ? (
            <DotLoader />
          ) : changes === 0 ? (
            "Nothing to import"
          ) : (
            `Confirm import (${changes} change${changes === 1 ? "" : "s"})`
          )}
        </ButtonPrimary>
      </div>
    </div>
  );
}

function StatRow(props: { label: string; value: number; bold?: boolean }) {
  return (
    <>
      <div className="text-tertiary">{props.label}</div>
      <div
        className={`text-right tabular-nums ${props.bold ? "font-bold text-primary" : "text-secondary"}`}
      >
        {props.value}
      </div>
    </>
  );
}

function ResultCard(props: { totals: ImportTotals }) {
  let t = props.totals;
  return (
    <div className="flex flex-col gap-2 border border-border-light rounded-md p-3">
      <div className="font-bold text-primary text-sm">Import complete</div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-sm self-start">
        <StatRow label="New subscribers" value={t.inserted} bold />
        <StatRow label="Reactivated" value={t.reactivated} bold />
        <StatRow label="Imported as unsubscribed" value={t.unsubscribed} bold />
        <StatRow label="Linked to existing accounts" value={t.linked} />
        <StatRow label="Unchanged" value={t.unchanged} />
        <StatRow label="Failed" value={t.failed} />
      </div>
      {t.failed > 0 && (
        <div className="text-xs text-accent-1">
          Some rows failed to write — check the server logs and re-run the
          import (it&apos;s idempotent) once the underlying issue is fixed.
        </div>
      )}
    </div>
  );
}
