import { useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  CalendarCheck,
  ChevronDown,
  Link2,
  Loader2,
  RefreshCw,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/convex/_generated/api";

const REMINDER_CHOICES = [
  { value: 0, label: "No horário" },
  { value: 10, label: "10 min antes" },
  { value: 30, label: "30 min antes" },
  { value: 60, label: "1 hora antes" },
  { value: 120, label: "2 horas antes" },
  { value: 1440, label: "1 dia antes" },
  { value: 2880, label: "2 dias antes" },
] as const;

export function GoogleMenu() {
  const googleStatus = useQuery(api.googleCalendar.status);
  const startConnect = useMutation(api.googleCalendar.startConnect);
  const disconnect = useMutation(api.googleCalendar.disconnect);
  const listCalendars = useAction(api.googleCalendar.listCalendars);
  const syncAll = useAction(api.googleCalendar.syncAll);
  const pickCalendar = useMutation(api.googleCalendar.setCalendarId);
  const saveReminder = useMutation(api.googleCalendar.setReminderMinutes);

  const [calendars, setCalendars] = useState<
    { id: string; summary: string }[]
  >([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const loadedOnce = useRef(false);

  const connected = googleStatus?.connected === true;

  // Load the calendar list once when the menu is first used while connected.
  useEffect(() => {
    if (connected && !loadedOnce.current) {
      loadedOnce.current = true;
      void loadCalendars();
    }
    if (!connected) {
      loadedOnce.current = false;
      setCalendars([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  const loadCalendars = async () => {
    setLoadingCalendars(true);
    try {
      const items = await listCalendars({});
      setCalendars(items);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível listar suas agendas.",
      );
    } finally {
      setLoadingCalendars(false);
    }
  };

  const handleConnect = async () => {
    try {
      const url = await startConnect({});
      window.location.href = url;
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível iniciar a conexão.",
      );
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect({});
      toast.success("Conta do Google desconectada.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível desconectar.",
      );
    }
  };

  const handleSyncAll = async (onlyPending: boolean) => {
    setSyncing(true);
    try {
      const result = await syncAll({ onlyPending });
      if (result.failed === 0) {
        toast.success(
          `${result.ok} sessão(ões) sincronizada(s) com o Google Calendar.`,
        );
      } else {
        toast.warning(
          `${result.ok} sincronizada(s), ${result.failed} falharam. Verifique a conexão.`,
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha na sincronização.",
      );
    } finally {
      setSyncing(false);
    }
  };

  const handlePickReminder = async (minutes: number) => {
    try {
      await saveReminder({ minutes });
      toast.success(
        minutes === 0
          ? "Avisos no horário da sessão."
          : `Aviso ${REMINDER_CHOICES.find((r) => r.value === minutes)?.label.toLowerCase()}.`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível salvar.",
      );
    }
  };

  const handlePickCalendar = async (calendarId: string) => {
    try {
      await pickCalendar({ calendarId });
      toast.success("Agenda selecionada.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível salvar.",
      );
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          {googleStatus === undefined ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : connected ? (
            <CalendarCheck className="size-3.5 text-emerald-600" />
          ) : (
            <Link2 className="size-3.5" />
          )}
          <span className="hidden sm:inline">
            {connected ? "Google conectado" : "Google Agenda"}
          </span>
          <ChevronDown className="size-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {connected ? (
          <>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Conta Google conectada
            </DropdownMenuLabel>
            <DropdownMenuItem
              disabled={syncing}
              onClick={() => void handleSyncAll(false)}
              className="cursor-pointer gap-2"
            >
              {syncing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Sincronizar todas as sessões
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={syncing}
              onClick={() => void handleSyncAll(true)}
              className="cursor-pointer gap-2"
            >
              <CalendarCheck className="size-3.5" />
              Somente pendentes
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Aviso antes de cada sessão
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={String(googleStatus?.reminderMinutes ?? 60)}
              onValueChange={(v) => void handlePickReminder(Number(v))}
            >
              {REMINDER_CHOICES.map((choice) => (
                <DropdownMenuRadioItem
                  key={choice.value}
                  value={String(choice.value)}
                  className="cursor-pointer text-xs"
                >
                  {choice.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Agenda de destino
            </DropdownMenuLabel>
            <p className="px-2 pb-1.5 text-[10px] text-muted-foreground">
              O lembrete é gravado no evento ao sincronizar — sincronize
              novamente para aplicar em eventos existentes.
            </p>
            {loadingCalendars ? (
              <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Carregando…
              </div>
            ) : calendars.length === 0 ? (
              <button
                type="button"
                onClick={() => void loadCalendars()}
                className="w-full px-2 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground"
              >
                Nenhuma agenda carregada — clicar para recarregar
              </button>
            ) : (
              <DropdownMenuRadioGroup
                value={googleStatus?.calendarId ?? ""}
                onValueChange={(value) => void handlePickCalendar(value)}
              >
                {calendars.map((cal) => (
                  <DropdownMenuRadioItem
                    key={cal.id}
                    value={cal.id}
                    className="cursor-pointer text-xs"
                  >
                    <span className="truncate">{cal.summary}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => void handleDisconnect()}
              className="cursor-pointer gap-2 text-destructive focus:text-destructive"
            >
              <Unlink className="size-3.5" />
              Desconectar Google
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Sincronize sessões com sua agenda
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => void handleConnect()}
              className="cursor-pointer gap-2"
            >
              <Link2 className="size-3.5" />
              Conectar Google Calendar
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
