import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { toast } from "sonner";
import { Bell, CalendarClock, CalendarDays } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate, type SessionWithClient } from "@/lib/sessions";

function dayOffset(days: number): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

function toMinutes(time?: string): number {
  const [hh, mm] = (time ?? "09:00").split(":");
  return Number(hh ?? 9) * 60 + Number(mm ?? 0);
}

export function AlertsBell() {
  const sessions = useQuery(api.sessions.list);

  const [open, setOpen] = useState(false);
  const readKeyRef = useRef<string | null>(null);
  const toastedRef = useRef(false);

  const buckets = useMemo(() => {
    const list: SessionWithClient[] = sessions ?? [];
    const now = dayOffset(0);
    const tomorrow = dayOffset(1);
    const dayAfter = dayOffset(2);
    const weekEnd = dayOffset(7);

    const inRange = list.filter(
      (s) => s.status === "agendada" && s.date >= now && s.date < weekEnd,
    );

    return {
      today: inRange
        .filter((s) => s.date < tomorrow)
        .sort((a, b) => toMinutes(a.time) - toMinutes(b.time)),
      tomorrow: inRange
        .filter((s) => s.date >= tomorrow && s.date < dayAfter)
        .sort((a, b) => toMinutes(a.time) - toMinutes(b.time)),
      upcoming: inRange
        .filter((s) => s.date >= dayAfter)
        .sort((a, b) => a.date - b.date || toMinutes(a.time) - toMinutes(b.time))
        .slice(0, 6),
      total: inRange.length,
    };
  }, [sessions]);

  const imminentCount = buckets.today.length + buckets.tomorrow.length;

  // One-time toast per dashboard visit when there are imminent sessions.
  useEffect(() => {
    if (toastedRef.current || imminentCount === 0) return;
    const key =
      [...buckets.today, ...buckets.tomorrow].map((s) => s._id).join(",") || "";
    if (readKeyRef.current === key) return;
    readKeyRef.current = key;
    toastedRef.current = true;
    const imminent = [...buckets.today, ...buckets.tomorrow].slice(0, 3);
    toast.warning(
      imminentCount === 1
        ? `Sessão agendada: "${imminent[0]!.title}" — ${formatDate(imminent[0]!.date)}${imminent[0]!.time ? ` às ${imminent[0]!.time}` : ""}`
        : `${imminentCount} sessões agendadas para hoje/amanhã — confira o sino de avisos`,
      { duration: 8000 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imminentCount]);

  const section = (title: string, items: SessionWithClient[]) => {
    if (items.length === 0) return null;
    return (
      <>
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {title}
        </DropdownMenuLabel>
        {items.map((s) => (
          <DropdownMenuItem key={s._id} className="cursor-pointer gap-2">
            <CalendarClock className="size-3.5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{s.title}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {s.clientName}
                {s.time ? ` · ${s.time}` : ""}
              </p>
            </div>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {formatDate(s.date)}
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
      </>
    );
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative"
          title="Avisos de sessões"
        >
          <Bell
            className={`size-4 ${imminentCount > 0 && !open ? "animate-pulse text-primary" : ""}`}
          />
          {buckets.total > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold leading-none text-primary-foreground">
              {buckets.total > 9 ? "9+" : buckets.total}
            </span>
          )}
          <span className="sr-only">Avisos de sessões agendadas</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <CalendarDays className="size-3.5 text-primary" />
          <span className="text-xs font-semibold">Avisos de sessões</span>
          <span className="text-[11px] text-muted-foreground">
            · próximos 7 dias
          </span>
        </div>
        <DropdownMenuSeparator />
        {buckets.total === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
            Nenhuma sessão agendada para os próximos 7 dias. 📭
          </p>
        ) : (
          <>
            {section("Hoje", buckets.today)}
            {section("Amanhã", buckets.tomorrow)}
            {section("Próximos dias", buckets.upcoming)}
          </>
        )}
        <p className="px-2 pb-1.5 pt-1 text-[10px] text-muted-foreground">
          Para receber pop-ups no celular, sincronize com o Google Agenda (menu
          Google Agenda).
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
