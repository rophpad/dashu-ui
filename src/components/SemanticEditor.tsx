"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useWorkspaces } from "./state";
import type { SemanticState } from "./types";

type Row = { term: string; meaning: string };

const EXAMPLE_TERMS: Row[] = [
  { term: "revenue", meaning: "the sum of payments.amount where status = 'succeeded'" },
  { term: "active customer", meaning: "a user with at least one order in the last 90 days" },
];

export default function SemanticEditor() {
  const { connected, version } = useWorkspaces();

  const [rows, setRows] = useState<Row[]>([]);
  const [notes, setNotes] = useState("");
  const [state, setState] = useState<SemanticState | null>(null);
  const [busy, setBusy] = useState<"save" | "reset" | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!connected) return;
    try {
      const res = await fetch("/api/semantic");
      if (!res.ok) return;
      const data = (await res.json()) as SemanticState;
      setState(data);
      setRows(
        Object.entries(data.layer.terms).map(([term, meaning]) => ({ term, meaning })),
      );
      setNotes(data.layer.notes.join("\n"));
    } catch {
      // Non-fatal: the editor just starts empty.
    }
  }, [connected]);

  // Re-read when the database changes — the glossary is scoped to it.
  useEffect(() => {
    void load();
  }, [load, version]);

  function update(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    setSaved(false);
  }

  async function save() {
    setBusy("save");
    setError(null);
    try {
      const terms: Record<string, string> = {};
      for (const row of rows) {
        if (row.term.trim() && row.meaning.trim()) terms[row.term.trim()] = row.meaning.trim();
      }
      const res = await fetch("/api/semantic", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          terms,
          notes: notes.split("\n").map((n) => n.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      await load();
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(null);
    }
  }

  async function reset() {
    setBusy("reset");
    setError(null);
    try {
      await fetch("/api/semantic", { method: "DELETE" });
      await load();
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(null);
    }
  }

  if (!connected) {
    return (
      <p className="text-[13px] leading-relaxed text-muted">
        Connect a database first — the glossary is saved against it.
      </p>
    );
  }

  const isDefault = state?.source !== "saved";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border bg-surface px-2.5 py-0.5 text-xs font-medium text-muted">
          {state?.source === "saved" ? "Saved for this database" : "Not set up yet"}
        </span>
        {state?.scope && (
          <span className="font-mono text-xs text-faint">{state.scope}</span>
        )}
      </div>

      {isDefault && (
        <p className="rounded-lg border border-dashed px-4 py-3 text-[13px] leading-relaxed text-muted">
          A glossary written for one database is misleading on another, so this is
          scoped to the connected one. Define the handful of terms your questions
          actually use — it does more for accuracy than any model setting.
        </p>
      )}

      {/* Terms */}
      <div>
        <p className="text-[13px] font-medium">Business vocabulary</p>
        <div className="mt-2 space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="flex items-start gap-2">
              <input
                value={row.term}
                onChange={(e) => update(i, { term: e.target.value })}
                placeholder="revenue"
                className="w-40 shrink-0 rounded-lg border bg-panel px-3 py-2 text-[13px] outline-none transition-all duration-150 placeholder:text-faint focus:border-accent focus:ring-4 focus:ring-accent/10"
              />
              <input
                value={row.meaning}
                onChange={(e) => update(i, { meaning: e.target.value })}
                placeholder="the sum of payments.amount where status = 'succeeded'"
                className="min-w-0 flex-1 rounded-lg border bg-panel px-3 py-2 text-[13px] outline-none transition-all duration-150 placeholder:text-faint focus:border-accent focus:ring-4 focus:ring-accent/10"
              />
              <button
                type="button"
                aria-label={`Remove ${row.term || "term"}`}
                onClick={() => {
                  setRows((prev) => prev.filter((_, idx) => idx !== i));
                  setSaved(false);
                }}
                className="rounded-lg p-2.5 text-faint transition-colors hover:bg-surface hover:text-fg"
              >
                <X size={14} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, { term: "", meaning: "" }])}
            className="rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 hover:bg-surface"
          >
            Add term
          </button>
          {rows.length === 0 && (
            <button
              type="button"
              onClick={() => setRows(EXAMPLE_TERMS)}
              className="rounded-lg px-3 py-1.5 text-[13px] text-muted transition-colors duration-150 hover:bg-surface hover:text-fg"
            >
              Start from an example
            </button>
          )}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="semantic-notes" className="block text-[13px] font-medium">
          Notes about this database
        </label>
        <textarea
          id="semantic-notes"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSaved(false);
          }}
          rows={4}
          placeholder={
            "One per line, e.g.\nSoft-deleted rows have deleted_at IS NOT NULL — exclude them.\nMoney is stored in whole currency units, not cents."
          }
          className="mt-1.5 w-full resize-y rounded-lg border bg-panel px-3 py-2 text-[13px] leading-relaxed outline-none transition-all duration-150 placeholder:text-faint focus:border-accent focus:ring-4 focus:ring-accent/10"
        />
      </div>

      {error && (
        <p className="rounded-lg border bg-surface px-3.5 py-2.5 text-[13px] leading-relaxed">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy !== null}
          className="rounded-lg bg-accent px-3.5 py-2 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-accent-hover disabled:opacity-25"
        >
          {busy === "save" ? "Saving…" : saved ? "Saved" : "Save glossary"}
        </button>
        {state?.source === "saved" && (
          <button
            type="button"
            onClick={() => void reset()}
            disabled={busy !== null}
            className="ml-auto rounded-lg px-3 py-2 text-[13px] text-muted transition-colors duration-150 hover:bg-surface hover:text-fg disabled:opacity-25"
          >
            {busy === "reset" ? "Resetting…" : "Reset to defaults"}
          </button>
        )}
      </div>
    </div>
  );
}
