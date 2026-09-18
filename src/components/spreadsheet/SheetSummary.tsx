import { CalendarDays, ChartNoAxesColumn, CircleAlert } from "lucide-react";
import {
  SheetCell,
  SheetRow,
  SheetTable,
  StatusPill,
  type SheetColumn,
} from "./sheet";
import {
  STATUS_META,
  formatBRL,
  formatDate,
  type SessionWithClient,
} from "@/lib/sessions";

const kpiColumns: SheetColumn[] = [
  { label: "Indicador", width: 220 },
  { label: "Valor", width: 140, align: "right" },
];

const listColumns: SheetColumn[] = [
  { label: "Sessão", width: 180 },
  { label: "Cliente", width: 150 },
  { label: "Data", width: 110 },
  { label: "Status", width: 120 },
  { label: "Valor", width: 110, align: "right" },
  { label: "Saldo", width: 110, align: "right" },
];

export function SheetSummary({
  sessions,
  clientCount,
  onActiveCellChange,
}: {
  sessions: SessionWithClient[];
  clientCount: number;
  onActiveCellChange: (ref: string, value: string) => void;
}) {
  const active = sessions.filter((s) => s.status !== "cancelada");
  const upcoming = active
    .filter((s) => s.date >= startOfToday())
    .sort((a, b) => a.date - b.date)
    .slice(0, 8);
  const receivables = active
    .filter((s) => s.price - s.paid > 0)
    .sort((a, b) => b.price - b.paid - (a.price - a.paid))
    .slice(0, 8);

  const totals = {
    clients: clientCount,
    activeSessions: active.length,
    revenue: active.reduce((sum, s) => sum + s.price, 0),
    received: active.reduce((sum, s) => sum + s.paid, 0),
    due: active.reduce((sum, s) => sum + Math.max(0, s.price - s.paid), 0),
    realized: active
      .filter((s) => s.status === "realizada")
      .reduce((sum, s) => sum + s.price, 0),
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border/70 bg-muted/30 px-3 py-2">
        <ChartNoAxesColumn className="size-4 text-primary" />
        <span className="text-sm font-medium">Resumo</span>
        <span className="text-xs text-muted-foreground">
          · valores consolidados
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-auto p-4">
        {/* KPIs */}
        <section className="overflow-hidden rounded-xl border border-border/70">
          <div className="flex items-center gap-2 border-b border-border/70 bg-muted/50 px-3 py-1.5">
            <ChartNoAxesColumn className="size-3.5 text-primary" />
            <span className="text-xs font-semibold tracking-tight">
              Indicadores
            </span>
          </div>
          <SheetTable columns={kpiColumns}>
            {(
              [
                ["Clientes cadastrados", totals.clients],
                ["Sessões ativas", totals.activeSessions],
                ["Valor total contratado", formatBRL(totals.revenue)],
                ["Total recebido", formatBRL(totals.received)],
                ["Total a receber", formatBRL(totals.due)],
                ["Faturado em sessões realizadas", formatBRL(totals.realized)],
              ] as const
            ).map(([label, value], i) => (
              <SheetRow
                key={label}
                index={i}
                onActivate={onActiveCellChange}
              >
                <SheetCell className="font-medium">{label}</SheetCell>
                <SheetCell align="right" className="tabular-nums">
                  <span className={i >= 2 ? "font-semibold" : undefined}>
                    {value}
                  </span>
                </SheetCell>
              </SheetRow>
            ))}
          </SheetTable>
        </section>

        {/* Próximas sessões */}
        <section className="overflow-hidden rounded-xl border border-border/70">
          <div className="flex items-center gap-2 border-b border-border/70 bg-muted/50 px-3 py-1.5">
            <CalendarDays className="size-3.5 text-primary" />
            <span className="text-xs font-semibold tracking-tight">
              Próximas sessões
            </span>
          </div>
          <SheetTable columns={listColumns}>
            {upcoming.length === 0 ? (
              <tr>
                <td
                  colSpan={listColumns.length + 1}
                  className="px-4 py-6 text-center text-sm text-muted-foreground"
                >
                  Nenhuma sessão futura — crie uma na aba Sessões.
                </td>
              </tr>
            ) : (
              upcoming.map((s, i) => (
                <SheetRow
                  key={s._id}
                  index={i}
                  onActivate={onActiveCellChange}
                >
                  <SheetCell className="font-medium">{s.title}</SheetCell>
                  <SheetCell>{s.clientName}</SheetCell>
                  <SheetCell className="tabular-nums">
                    {formatDate(s.date)}
                    {s.time ? ` · ${s.time}` : ""}
                  </SheetCell>
                  <SheetCell>
                    <StatusPill status={s.status} />
                  </SheetCell>
                  <SheetCell align="right" className="tabular-nums">
                    {formatBRL(s.price)}
                  </SheetCell>
                  <SheetCell align="right" className="tabular-nums">
                    {s.price - s.paid > 0 ? (
                      <span className="font-medium text-primary">
                        {formatBRL(s.price - s.paid)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </SheetCell>
                </SheetRow>
              ))
            )}
          </SheetTable>
        </section>

        {/* A receber */}
        <section className="overflow-hidden rounded-xl border border-border/70">
          <div className="flex items-center gap-2 border-b border-border/70 bg-muted/50 px-3 py-1.5">
            <CircleAlert className="size-3.5 text-primary" />
            <span className="text-xs font-semibold tracking-tight">
              A receber (top 8)
            </span>
          </div>
          <SheetTable columns={listColumns}>
            {receivables.length === 0 ? (
              <tr>
                <td
                  colSpan={listColumns.length + 1}
                  className="px-4 py-6 text-center text-sm text-muted-foreground"
                >
                  Tudo em dia! Nenhum saldo pendente.
                </td>
              </tr>
            ) : (
              receivables.map((s, i) => (
                <SheetRow
                  key={s._id}
                  index={i}
                  onActivate={onActiveCellChange}
                >
                  <SheetCell className="font-medium">{s.title}</SheetCell>
                  <SheetCell>{s.clientName}</SheetCell>
                  <SheetCell className="tabular-nums">
                    {formatDate(s.date)}
                  </SheetCell>
                  <SheetCell>
                    <StatusPill status={s.status} />
                  </SheetCell>
                  <SheetCell align="right" className="tabular-nums">
                    {formatBRL(s.price)}
                  </SheetCell>
                  <SheetCell align="right" className="tabular-nums">
                    <span className="font-semibold text-primary">
                      {formatBRL(s.price - s.paid)}
                    </span>
                  </SheetCell>
                </SheetRow>
              ))
            )}
          </SheetTable>
        </section>
      </div>
    </div>
  );
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// re-export for status labels used in tooltip strings
export { STATUS_META };
