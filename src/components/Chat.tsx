"use client";

import { ArrowUp, Check, ChevronRight, Copy, FileDown, RotateCcw } from "lucide-react";
import Link from "next/link";
import Logo from "./Logo";
import { useEffect, useRef, useState } from "react";
import Chart from "./Chart";
import PageHeader from "./PageHeader";
import ResultTable from "./ResultTable";
import SaveToDashboard from "./SaveToDashboard";
import { useWorkspaces, useConversations } from "./state";
import type { AskResponse, AskSuccess, Message, Table } from "./types";

type Suggestion = { title: string; hint: string };

/** Works against any schema, including one we couldn't read. */
const GENERIC: Suggestion[] = [
  { title: "How many rows are in each table?", hint: "Overview of the database" },
  { title: "Which tables hold the most data?", hint: "Where to start looking" },
];

const CATEGORICAL_HINTS = [
  "status",
  "type",
  "kind",
  "category",
  "state",
  "role",
  "level",
  "source",
  "channel",
  "country",
  "currency",
];

/**
 * Build starter prompts from the connected schema.
 *
 * Hard-coded examples ("Which customers generate the most revenue?") only work
 * on a database that happens to have customers and revenue. These name real
 * tables and columns instead, so the first click always has something to hit.
 */
function buildSuggestions(tables: Table[]): Suggestion[] {
  if (!tables.length) return GENERIC;

  const out: Suggestion[] = [
    { title: "How many rows are in each table?", hint: "Overview of the database" },
  ];

  // Widest table is usually the substantive one rather than a join table.
  const widest = [...tables].sort((a, b) => b.columns.length - a.columns.length)[0];
  if (widest) {
    out.push({
      title: `Show me 10 rows from ${widest.name}`,
      hint: `Sample records · ${widest.columns.length} columns`,
    });
  }

  // An enum is a guaranteed-good grouping key; otherwise a column that reads
  // like a category.
  let grouping: { table: string; column: string } | null = null;
  for (const table of tables) {
    const enumCol = table.columns.find((c) => c.enumValues?.length);
    if (enumCol) {
      grouping = { table: table.name, column: enumCol.name };
      break;
    }
  }
  if (!grouping) {
    for (const table of tables) {
      const named = table.columns.find(
        (c) =>
          /text|varchar|char/.test(c.type) &&
          CATEGORICAL_HINTS.some((h) => c.name.toLowerCase().includes(h)),
      );
      if (named) {
        grouping = { table: table.name, column: named.name };
        break;
      }
    }
  }
  if (grouping) {
    out.push({
      title: `Count ${grouping.table} grouped by ${grouping.column}`,
      hint: "Breakdown by category",
    });
  }

  // Anything with a date gives a trend.
  let temporal: { table: string; column: string } | null = null;
  for (const table of tables) {
    const dated = table.columns.find((c) => /timestamp|date/.test(c.type));
    if (dated) {
      temporal = { table: table.name, column: dated.name };
      break;
    }
  }
  if (temporal) {
    out.push({
      title: `How many ${temporal.table} per month by ${temporal.column}?`,
      hint: "Trend over time",
    });
  }

  // A second table means a join is worth demonstrating. Phrased as a request
  // for rows, not for schema — the model answers with data, not description.
  if (out.length < 4 && tables.length > 1) {
    out.push({
      title: `Show ${tables[0].name} with their related ${tables[1].name}`,
      hint: "Across a relationship",
    });
  }

  return out.slice(0, 4);
}

/** [title line 1, optional title line 2, hint] */
const SKELETON_ROWS: [string, string, string][] = [
  ["w-4/5", "", "w-1/3"],
  ["w-11/12", "w-1/2", "w-2/5"],
  ["w-2/3", "", "w-1/4"],
  ["w-5/6", "w-1/3", "w-1/3"],
];

function SuggestionSkeleton() {
  return (
    <>
      {SKELETON_ROWS.map(([first, second, hint], i) => (
        <div key={i} className="rounded-xl border bg-panel p-4" aria-hidden="true">
          <div className={`h-3.5 animate-pulse rounded bg-surface-hover ${first}`} />
          {second && (
            <div
              className={`mt-1.5 h-3.5 animate-pulse rounded bg-surface-hover ${second}`}
            />
          )}
          <div className={`mt-3 h-2.5 animate-pulse rounded bg-surface ${hint}`} />
        </div>
      ))}
    </>
  );
}

function SqlBlock({ sql }: { sql: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mt-4 overflow-hidden rounded-lg border bg-surface">
      <div className="flex items-center justify-between px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 rounded-md px-1 py-0.5 text-xs font-medium text-muted transition-colors hover:text-fg"
        >
          <ChevronRight
            size={12}
            strokeWidth={2}
            aria-hidden="true"
            className={`transition-transform duration-150 ${open ? "rotate-90" : ""}`}
          />
          SQL
        </button>
        {open && (
          <button
            type="button"
            onClick={copy}
            className="rounded-md px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-fg"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
      {open && (
        <pre className="overflow-x-auto border-t bg-panel px-4 py-3 font-mono text-[12.5px] leading-relaxed">
          {sql}
        </pre>
      )}
    </div>
  );
}

function downloadCsv(result: AskSuccess) {
  const escape = (value: unknown) => {
    if (value === null || value === undefined) return "";
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = [result.columns, ...result.rows]
    .map((row) => row.map(escape).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `dashu-results-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function UserQuestionActions({
  question,
  busy,
  onRetry,
}: {
  question: string;
  busy: boolean;
  onRetry: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(question);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-1 flex items-center justify-end gap-1 text-faint">
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={copied ? "Question copied" : "Copy question"}
        title={copied ? "Copied" : "Copy question"}
        className="rounded-md p-1.5 transition-colors hover:bg-surface hover:text-fg"
      >
        {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      </button>
      <button
        type="button"
        onClick={onRetry}
        disabled={busy}
        aria-label="Retry question"
        title="Retry question"
        className="rounded-md p-1.5 transition-colors hover:bg-surface hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
      >
        <RotateCcw size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

function ResultCard({ result, question, pro }: { result: AskSuccess; question: string; pro: boolean }) {
  return (
    <div className="rise rounded-xl border bg-panel p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] leading-relaxed">{result.explanation}</p>
        <div className="flex shrink-0 items-center gap-1">
          {pro && result.rows.length > 0 && (
            <button
              type="button"
              onClick={() => downloadCsv(result)}
              aria-label="Export table as CSV"
              title="Export table as CSV"
              className="rounded-md p-2 text-muted transition-colors hover:bg-surface hover:text-fg"
            >
              <FileDown size={15} aria-hidden="true" />
            </button>
          )}
          <SaveToDashboard
            question={question}
            sql={result.sql}
            explanation={result.explanation}
            chart={result.chart}
          />
        </div>
      </div>
      <Chart spec={result.chart} columns={result.columns} rows={result.rows} pro={pro} />
      <ResultTable
        columns={result.columns}
        rows={result.rows}
        truncated={result.truncated}
        limit={result.limit}
      />
      <SqlBlock sql={result.sql} />
    </div>
  );
}

export default function Chat() {
  const { messages, append, activeId, active, startNew } = useConversations();
  const { active: workspace, connected, version, pro } = useWorkspaces();

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  // Starter prompts come from the live schema, so they name tables that exist.
  // Only fetched while the empty state is visible.
  useEffect(() => {
    if (!connected || messages.length > 0) return;
    let cancelled = false;
    // Back to the skeleton, so switching workspaces doesn't leave the previous
    // database's tables on screen while the new schema loads.
    setSuggestions(null);
    fetch("/api/schema")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        setSuggestions(
          data ? buildSuggestions((data.tables ?? []) as Table[]) : GENERIC,
        );
      })
      .catch(() => {
        // A failed read still leaves something clickable.
        if (!cancelled) setSuggestions(GENERIC);
      });
    return () => {
      cancelled = true;
    };
  }, [connected, messages.length, version]);

  // Grow the composer with its content, up to a ceiling.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || busy) return;

    append({ role: "user", text: trimmed });
    setInput("");
    setBusy(true);

    // Only successful turns are worth replaying as context for follow-ups.
    const history = messages.flatMap((m, i) => {
      if (!("result" in m)) return [];
      const prior = messages[i - 1];
      if (!prior || prior.role !== "user") return [];
      return [{ question: prior.text, sql: m.result.sql }];
    });

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, history }),
      });
      const data = (await res.json()) as AskResponse;

      let reply: Message;
      if ("error" in data) {
        reply = {
          role: "assistant",
          error: data.error,
          sql: data.sql,
          configure: data.kind === "not_configured",
        };
      } else if (data.answered === false) {
        reply = { role: "assistant", note: data.explanation };
      } else {
        reply = { role: "assistant", result: data };
      }
      append(reply);
    } catch (err) {
      append({
        role: "assistant",
        error: `Could not reach the server: ${String(err)}`,
      });
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void ask(input);
    }
  }

  const empty = messages.length === 0;

  return (
    <>
      <PageHeader title={active?.title ?? "New chat"}>
        {!empty && (
          <button
            type="button"
            onClick={startNew}
            className="rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 hover:bg-surface"
          >
            New chat
          </button>
        )}
      </PageHeader>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        {empty ? (
          <div className="pt-10">
            <Logo className="mb-5 h-11 w-auto text-fg" />
            <h2 className="text-[32px] font-semibold leading-tight tracking-[-0.02em]">
              Ask your database anything.
            </h2>
            <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted">
              Questions in plain English become SQL, run against your database, and come
              back as tables and charts.
            </p>

            {!connected ? (
              <div className="mt-8 rounded-xl border bg-surface p-6">
                <p className="text-[15px] font-medium">Connect a database to begin</p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
                  Dashu reads your schema on connect, then answers questions against it.
                  A role with <span className="font-mono">SELECT</span> access is all it
                  needs.
                </p>
                <Link
                  href="/settings"
                  className="mt-4 inline-block rounded-lg bg-accent px-3.5 py-2 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-accent-hover"
                >
                  Connect a database
                </Link>
              </div>
            ) : (
              <div
                className="mt-8 grid gap-2.5 sm:grid-cols-2"
                aria-busy={suggestions === null}
              >
                {suggestions === null && <SuggestionSkeleton />}
                {suggestions?.map((example) => (
                  <button
                    key={example.title}
                    type="button"
                    onClick={() => void ask(example.title)}
                    className="rounded-xl border bg-panel p-4 text-left transition-all duration-150 hover:border-accent-line hover:shadow-card"
                  >
                    <span className="block text-[14px] font-medium leading-snug">
                      {example.title}
                    </span>
                    <span className="mt-1 block text-xs text-faint">{example.hint}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message, i) =>
              message.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%]">
                    <p className="rise rounded-2xl bg-surface-hover px-4 py-2.5 text-[15px] leading-relaxed">
                      {message.text}
                    </p>
                    <UserQuestionActions
                      question={message.text}
                      busy={busy}
                      onRetry={() => void ask(message.text)}
                    />
                  </div>
                </div>
              ) : (
                <div key={i}>
                  {"result" in message && (
                    <ResultCard
                      result={message.result}
                      pro={pro}
                      question={
                        messages[i - 1]?.role === "user"
                          ? (messages[i - 1] as { text: string }).text
                          : ""
                      }
                    />
                  )}
                  {"note" in message && (
                    <div className="rise rounded-xl border bg-panel p-5 shadow-card">
                      <p className="text-[15px] leading-relaxed text-muted">
                        {message.note}
                      </p>
                    </div>
                  )}
                  {"error" in message && (
                    <div className="rise rounded-xl border bg-surface p-5">
                      <p className="text-[15px] leading-relaxed">{message.error}</p>
                      {message.configure && (
                        <Link
                          href="/settings"
                          className="mt-3 inline-block rounded-lg bg-accent px-3.5 py-2 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-accent-hover"
                        >
                          Connect a database
                        </Link>
                      )}
                      {message.sql && <SqlBlock sql={message.sql} />}
                    </div>
                  )}
                </div>
              ),
            )}

            {busy && (
              <div className="flex items-center gap-2 rounded-xl border bg-panel px-5 py-4 shadow-card">
                <span className="flex gap-1">
                  <span className="dot h-1.5 w-1.5 rounded-full bg-fg" />
                  <span
                    className="dot h-1.5 w-1.5 rounded-full bg-fg"
                    style={{ animationDelay: "0.15s" }}
                  />
                  <span
                    className="dot h-1.5 w-1.5 rounded-full bg-fg"
                    style={{ animationDelay: "0.3s" }}
                  />
                </span>
                <span className="text-sm text-muted">Writing the query…</span>
              </div>
            )}
          </div>
        )}

        <div ref={endRef} />
      </main>

      <div className="composer-fade sticky bottom-0 z-10 pb-4 pt-6">
        <div className="mx-auto w-full max-w-3xl px-6">
          <div className="flex items-end gap-2 rounded-2xl border bg-panel p-2 pl-4 shadow-float transition-all duration-150 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/10">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder={
                connected ? "Ask a question…" : "Connect a database to start asking…"
              }
              disabled={busy}
              className="max-h-40 flex-1 resize-none self-center bg-transparent py-2 text-[15px] leading-relaxed outline-none placeholder:text-faint disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => void ask(input)}
              disabled={busy || !input.trim()}
              aria-label="Send question"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-all duration-150 hover:opacity-85 disabled:opacity-20"
            >
              <ArrowUp size={15} strokeWidth={2.25} aria-hidden="true" />
            </button>
          </div>
          <p className="mt-2 px-1 text-xs text-faint">
            Enter to send · Shift+Enter for a new line
            {workspace?.label ? ` · ${workspace.label}` : ""}
          </p>
        </div>
      </div>
    </>
  );
}
