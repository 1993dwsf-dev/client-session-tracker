import type { Doc, Id } from "@/convex/_generated/dataModel";

export type SessionStatus =
  | "orcamento"
  | "agendada"
  | "realizada"
  | "cancelada";

export type SessionWithClient = Doc<"sessions"> & { clientName: string };
export type ClientDoc = Doc<"clients">;
export type ClientId = Id<"clients">;

export const STATUS_META: Record<
  SessionStatus,
  { label: string; badge: string; dot: string }
> = {
  orcamento: {
    label: "Orçamento",
    badge:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  agendada: {
    label: "Agendada",
    badge:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  realizada: {
    label: "Realizada",
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  cancelada: {
    label: "Cancelada",
    badge:
      "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-500/25 dark:bg-zinc-500/10 dark:text-zinc-300",
    dot: "bg-zinc-400",
  },
};

export const SESSION_STATUS_VALUES = Object.keys(
  STATUS_META,
) as SessionStatus[];

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const weekdayFmt = new Intl.DateTimeFormat("pt-BR", { weekday: "long" });

export function formatDate(ts: number): string {
  return dateFmt.format(new Date(ts));
}

export function formatWeekday(ts: number): string {
  return weekdayFmt.format(new Date(ts));
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  });
}

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function initialLetters(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function parseMoney(value: string): number {
  const normalized = value
    .replace(/[^0-9,.-]/g, "")
    .replace(/\.(?=.*[.,])/g, "")
    .replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function clientSessionsSummary(
  sessions: Pick<SessionWithClient, "clientId" | "price" | "paid" | "status">[],
  clientId: ClientId,
) {
  const own = sessions.filter((s) => s.clientId === clientId);
  const active = own.filter((s) => s.status !== "cancelada");
  return {
    count: active.length,
    revenue: active.reduce((sum, s) => sum + s.price, 0),
    due: active.reduce((sum, s) => sum + Math.max(0, s.price - s.paid), 0),
  };
}
