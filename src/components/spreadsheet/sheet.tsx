import { useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { STATUS_META, type SessionStatus } from "@/lib/sessions";

export interface SheetColumn {
  label: string;
  width: number;
  align?: "left" | "right" | "center";
}

export function SheetTable({
  columns,
  children,
}: {
  columns: SheetColumn[];
  children: ReactNode;
}) {
  return (
    <div className="h-full overflow-auto">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead className="sticky top-0 z-30">
          <tr>
            <th className="sticky left-0 z-40 w-10 min-w-10 border-b border-r border-border/70 bg-muted" />
            {columns.map((col, i) => (
              <th
                key={col.label}
                style={{ minWidth: col.width }}
                className={cn(
                  "border-b border-r border-border/70 bg-muted px-3 py-1.5",
                  col.align === "right"
                    ? "text-right"
                    : col.align === "center"
                      ? "text-center"
                      : "text-left",
                )}
              >
                <span className="block text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/80">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="block text-xs font-semibold tracking-tight text-foreground">
                  {col.label}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function SheetRow({
  index,
  onActivate,
  children,
}: {
  index: number;
  onActivate?: (cellRef: string, value: string) => void;
  children: ReactNode;
}) {
  return (
    <tr className="group hover:bg-accent/30">
      <td
        onDoubleClick={() => onActivate?.(`A${index + 2}`, "linha")}
        className="sticky left-0 z-10 w-10 min-w-10 border-b border-r border-border/60 bg-muted/70 text-center text-[11px] font-medium text-muted-foreground group-hover:bg-muted"
      >
        {index + 2}
      </td>
      {children}
    </tr>
  );
}

export function SheetCell({
  align = "left",
  className,
  children,
  title,
}: {
  align?: "left" | "right" | "center";
  className?: string;
  children: ReactNode;
  title?: string;
}) {
  return (
    <td
      title={title}
      className={cn(
        "max-w-[240px] border-b border-r border-border/40 px-3 py-2 align-middle",
        align === "right"
          ? "text-right"
          : align === "center"
            ? "text-center"
            : "text-left",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function EditableCell({
  value,
  onCommit,
  display,
  align = "left",
  placeholder,
  cell,
  onActivate,
  inputType = "text",
}: {
  value: string;
  onCommit: (next: string) => void;
  display?: ReactNode;
  align?: "left" | "right" | "center";
  placeholder?: string;
  cell?: string;
  onActivate?: (cellRef: string, value: string) => void;
  inputType?: "text" | "date" | "time";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <SheetCell align={align} className="p-0">
        <button
          type="button"
          onClick={() => {
            setDraft(value);
            setEditing(true);
            if (cell) onActivate?.(cell, value);
          }}
          className="w-full truncate px-3 py-2 text-left text-sm transition-colors hover:bg-accent/40"
        >
          {display ??
            (value || (
              <span className="text-muted-foreground/60">
                {placeholder ?? "—"}
              </span>
            ))}
        </button>
      </SheetCell>
    );
  }

  return (
    <td className="relative border-b border-r border-border/40 p-0 align-middle">
      <input
        autoFocus
        type={inputType}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (draft !== value) onCommit(draft);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="absolute inset-0 z-30 h-full w-full bg-card px-3 py-2 text-sm outline-none ring-2 ring-ring ring-inset"
      />
    </td>
  );
}

export function StatusPill({ status }: { status: SessionStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.badge}`}
    >
      <span className={`size-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}
