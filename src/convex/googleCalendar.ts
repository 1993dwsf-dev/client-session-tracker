import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type ActionCtx,
} from "./_generated/server";
import { api, internal } from "./_generated/api";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";

function credentialsConfigured(): boolean {
  return CLIENT_ID !== "" && CLIENT_SECRET !== "";
}

function redirectUri(): string {
  const siteUrl = process.env.CONVEX_SITE_URL;
  if (!siteUrl) throw new Error("CONVEX_SITE_URL não configurado.");
  return `${siteUrl}/api/google/callback`;
}

/** crypto.randomUUID is unavailable inside Convex mutations — use the
 *  cryptographic CSPRNG instead. NEVER use Math.random for security tokens:
 *  its output is predictable, so an attacker could guess OAuth state values. */
function randomId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Current token row for the signed-in user (null when not connected). */
export const getMyToken = internalQuery({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await ctx.db
      .query("googleTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
  },
});

/** Connection status for the UI (never exposes tokens). */
export const status = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return { connected: false as const };
    const row = await ctx.db
      .query("googleTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!row) return { connected: false as const };
    return {
      connected: true as const,
      calendarId: row.calendarId,
      reminderMinutes: row.reminderMinutes,
      connectedAt: row.connectedAt,
    };
  },
});

/** Builds the Google consent URL and stores an anti-CSRF state bound to the user. */
export const startConnect = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Não autenticado.");
    if (!credentialsConfigured()) {
      throw new Error(
        "Google Calendar não configurado: cadastre GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET nas chaves do projeto.",
      );
    }

    // Keep a single in-flight state per user: replace any previous one and
    // drop stale rows, so repeated clicks cannot flood the table.
    const previous = await ctx.db
      .query("googleAuthStates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const row of previous) {
      await ctx.db.delete(row._id);
    }

    const state = randomId();
    await ctx.db.insert("googleAuthStates", {
      state,
      userId,
      createdAt: Date.now(),
    });

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: redirectUri(),
      response_type: "code",
      scope: SCOPES,
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  },
});

/** Consumes one state value (single-use CSRF check) and returns its user.
 *  INTERNAL ONLY: making this a public mutation would let any signed-in client
 *  claim a victim's in-flight OAuth state by guessing it (auth binding). */
export const consumeAuthState = internalMutation({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("googleAuthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .unique();
    if (!row) return null;
    await ctx.db.delete(row._id);
    // Expire after 15 minutes.
    if (Date.now() - row.createdAt > 15 * 60 * 1000) return null;
    return row.userId;
  },
});

/** Stores tokens for the user bound to the OAuth state (internal only). */
export const storeTokens = internalMutation({
  args: {
    userId: v.id("users"),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("googleTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        accessToken: args.accessToken,
        ...(args.refreshToken ? { refreshToken: args.refreshToken } : {}),
        expiresAt: args.expiresAt,
      });
    } else {
      await ctx.db.insert("googleTokens", {
        userId: args.userId,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        expiresAt: args.expiresAt,
        connectedAt: Date.now(),
      });
    }
  },
});

/** Persists a refreshed access token (internal only). */
export const storeRefreshedToken = internalMutation({
  args: {
    userId: v.id("users"),
    accessToken: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("googleTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    if (row) {
      await ctx.db.patch(row._id, {
        accessToken: args.accessToken,
        expiresAt: args.expiresAt,
      });
    }
  },
});

/** HTTP callback: exchanges the code, validates state, saves tokens.
 *  INTERNAL ONLY: the public Convex API can invoke any public action, and this
 *  one has no session of its own (Google's redirect carries no auth header) —
 *  it trusts the state row alone. It exists solely for the http.route below. */
export const oauthCallback = internalAction({
  args: { code: v.string(), state: v.string() },
  handler: async (ctx, args) => {
    const userId = await ctx.runMutation(
      internal.googleCalendar.consumeAuthState,
      { state: args.state },
    );
    if (!userId) {
      return { ok: false as const, reason: "state" as const };
    }

    const body = new URLSearchParams({
      code: args.code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    });

    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[googleCalendar] token exchange failed:", detail);
      return { ok: false as const, reason: "exchange" as const };
    }
    const tokens = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    await ctx.runMutation(internal.googleCalendar.storeTokens, {
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    });

    return { ok: true as const, reason: "ok" as const };
  },
});

export const setCalendarId = mutation({
  args: { calendarId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Não autenticado.");
    const row = await ctx.db
      .query("googleTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!row) throw new Error("Conecte sua conta primeiro.");
    await ctx.db.patch(row._id, { calendarId: args.calendarId });
  },
});

export const setReminderMinutes = mutation({
  args: { minutes: v.number() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Não autenticado.");
    const row = await ctx.db
      .query("googleTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!row) throw new Error("Conecte sua conta primeiro.");
    await ctx.db.patch(row._id, { reminderMinutes: args.minutes });
  },
});

/** Deletes the stored token row (internal only). */
export const deleteTokenRow = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("googleTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    if (row) await ctx.db.delete(row._id);
  },
});

/** Disconnects the Google account. Revokes the refresh token at Google first
 *  (otherwise it would stay valid server-side even after we delete our copy),
 *  then removes the local credentials. Revocation is best-effort. */
export const disconnect = action({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Não autenticado.");
    const row = await ctx.runQuery(internal.googleCalendar.getMyToken, {});
    const tokenToRevoke = row?.refreshToken ?? row?.accessToken;
    if (tokenToRevoke) {
      try {
        await fetch("https://oauth2.googleapis.com/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ token: tokenToRevoke }),
        });
      } catch (err) {
        console.error("[googleCalendar] revoke failed:", err);
      }
    }
    await ctx.runMutation(internal.googleCalendar.deleteTokenRow, { userId });
  },
});

/** Saves the event id on the session after a successful push (internal —
 *  only reachable through the sync actions, which check ownership). */
export const setEventId = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    eventId: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return;
    await ctx.db.patch(args.sessionId, {
      googleEventId: args.eventId ?? undefined,
    });
  },
});

/** Session + client name, ownership-checked (read from actions). */
export const getSessionForSync = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) return null;
    const client = await ctx.db.get(session.clientId);
    return {
      _id: session._id,
      title: session.title,
      type: session.type,
      date: session.date,
      time: session.time,
      location: session.location,
      price: session.price,
      paid: session.paid,
      notes: session.notes,
      notifyClient: session.notifyClient,
      googleEventId: session.googleEventId,
      clientName: client?.name ?? "Cliente",
      clientPhone: client?.phone,
    };
  },
});

/** Ids of sessions to bulk-sync, ownership-checked (read from actions). */
export const getSessionIdsForSync = query({
  args: { onlyPending: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return sessions
      .filter(
        (s) =>
          s.status !== "cancelada" && (!args.onlyPending || !s.googleEventId),
      )
      .map((s) => s._id);
  },
});

/** Returns a valid access token, refreshing it when close to expiry. */
async function getFreshAccessToken(ctx: ActionCtx): Promise<string> {
  const row = await ctx.runQuery(internal.googleCalendar.getMyToken, {});
  if (!row) throw new Error("Conecte sua conta do Google primeiro.");

  if (row.expiresAt - Date.now() > 60_000) return row.accessToken;
  if (!row.refreshToken) {
    throw new Error(
      "Sessão do Google expirada. Desconecte e conecte novamente.",
    );
  }

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: row.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[googleCalendar] refresh failed:", detail);
    throw new Error("Não foi possível renovar o acesso ao Google.");
  }
  const tokens = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  const expiresAt = Date.now() + tokens.expires_in * 1000;
  await ctx.runMutation(internal.googleCalendar.storeRefreshedToken, {
    userId: row.userId,
    accessToken: tokens.access_token,
    expiresAt,
  });
  return tokens.access_token;
}

/** Lists the user's calendars so they can pick a target. */
export const listCalendars = action({
  args: {},
  handler: async (ctx) => {
    const token = await getFreshAccessToken(ctx);
    const res = await fetch(`${CALENDAR_API}/users/me/calendarList`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[googleCalendar] listCalendars failed:", detail);
      throw new Error("Não foi possível listar suas agendas.");
    }
    const data = (await res.json()) as {
      items?: { id: string; summary: string; primary?: boolean }[];
    };
    return (data.items ?? []).map((c) => ({
      id: c.id,
      summary: c.primary ? `${c.summary} (principal)` : c.summary,
    }));
  },
});

function buildEventBody(
  session: {
    title: string;
    clientName: string;
    type?: string;
    date: number;
    time?: string;
  location?: string;
  price: number;
  paid: number;
  notes?: string;
  notifyClient?: boolean;
  clientPhone?: string;
},
  reminderMinutes?: number,
) {
  const d = new Date(session.date);
  const [hh, mm] = (session.time ?? "09:00").split(":");
  const start = new Date(d);
  start.setHours(Number(hh ?? 9), Number(mm ?? 0), 0, 0);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const fmt = (x: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}:00`;
  };
  const lines = [
    `Cliente: ${session.clientName}`,
    session.clientPhone ? `WhatsApp: ${session.clientPhone}` : null,
    session.type ? `Tipo: ${session.type}` : null,
    `Valor: R$ ${session.price.toFixed(2)} | Pago: R$ ${session.paid.toFixed(2)}`,
    session.notifyClient ? "⚠ Avisar o cliente sobre esta sessão" : null,
    session.notes ?? null,
  ].filter(Boolean);
  const reminder = reminderMinutes ?? 60;
  const remindersBlock =
    reminder === 0
      ? { useDefault: true }
      : { useDefault: false, overrides: [{ method: "popup" as const, minutes: reminder }] };
  return {
    summary: `${session.title} — ${session.clientName}`,
    description: lines.join("\n"),
    ...(session.location ? { location: session.location } : {}),
    start: { dateTime: fmt(start), timeZone: "America/Sao_Paulo" },
    end: { dateTime: fmt(end), timeZone: "America/Sao_Paulo" },
    reminders: remindersBlock,
  };
}

async function pushSession(ctx: ActionCtx, sessionId: string) {
  const session = await ctx.runQuery(api.googleCalendar.getSessionForSync, {
    sessionId: sessionId as never,
    });
    if (!session) throw new Error("Sessão não encontrada.");

    const token = await getFreshAccessToken(ctx);
    const myToken = await ctx.runQuery(internal.googleCalendar.getMyToken, {});
    const calendarId = myToken?.calendarId ?? "primary";
    const reminderMinutes = myToken?.reminderMinutes;

  const body = JSON.stringify(buildEventBody(session, reminderMinutes));
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const base = `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`;

  let res: Response;
  if (session.googleEventId) {
    res = await fetch(
      `${base}/${encodeURIComponent(session.googleEventId)}`,
      { method: "PATCH", headers, body },
    );
    if (res.status === 404 || res.status === 410) {
      res = await fetch(base, { method: "POST", headers, body });
    }
  } else {
    res = await fetch(base, { method: "POST", headers, body });
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[googleCalendar] syncSession failed:", detail);
    throw new Error("O Google rejeitou a sincronização da sessão.");
  }
  const event = (await res.json()) as { id: string };
  await ctx.runMutation(internal.googleCalendar.setEventId, {
    sessionId: sessionId as never,
    eventId: event.id,
  });
  return event.id;
}

/** Pushes one session as a Google Calendar event (create or update). */
export const syncSession = action({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const eventId = await pushSession(ctx, args.sessionId);
    return { eventId };
  },
});

/** Pushes every non-cancelled session (or only the ones not yet synced). */
export const syncAll = action({
  args: { onlyPending: v.boolean() },
  handler: async (
    ctx,
    args,
  ): Promise<{ total: number; ok: number; failed: number }> => {
    const ids = await ctx.runQuery(api.googleCalendar.getSessionIdsForSync, {
      onlyPending: args.onlyPending,
    });
    if (ids.length === 0) {
      throw new Error("Nenhuma sessão para sincronizar.");
    }

    let ok = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        await pushSession(ctx, id);
        ok += 1;
      } catch {
        failed += 1;
      }
    }
    return { total: ids.length, ok, failed };
  },
});
