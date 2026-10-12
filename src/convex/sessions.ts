import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { logAudit } from "./auditLogs";
import { mutation, query } from "./_generated/server";
import { sessionStatusValidator } from "./schema";

const cleanText = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

function validateSessionInput(args: {
  title: string;
  date: number;
  time?: string;
  price: number;
  paid: number;
}) {
  const title = args.title.trim();

  if (!title) {
    throw new Error("Dê um nome à sessão.");
  }

  if (title.length > 200) {
    throw new Error("O nome da sessão excede o limite de 200 caracteres.");
  }

  if (
    !Number.isFinite(args.date) ||
    !Number.isFinite(new Date(args.date).getTime()) ||
    args.date < 0
  ) {
    throw new Error("Data da sessão inválida.");
  }

  if (!Number.isFinite(args.price) || args.price < 0) {
    throw new Error("O valor da sessão não pode ser negativo ou inválido.");
  }

  if (!Number.isFinite(args.paid) || args.paid < 0) {
    throw new Error("O valor pago não pode ser negativo ou inválido.");
  }

  if (args.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(args.time)) {
    throw new Error("Horário inválido. Use o formato HH:mm.");
  }
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    const clients = await ctx.db
      .query("clients")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const names = new Map(clients.map((c) => [c._id, c.name]));

    return sessions.map((session) => ({
      ...session,
      clientName: names.get(session.clientId) ?? "Cliente removido",
    }));
  },
});

export const create = mutation({
  args: {
    clientId: v.id("clients"),
    title: v.string(),
    type: v.optional(v.string()),
    date: v.number(),
    time: v.optional(v.string()),
    location: v.optional(v.string()),
    price: v.number(),
    paid: v.number(),
    status: sessionStatusValidator,
    notes: v.optional(v.string()),
    notifyClient: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Não autenticado.");

    const client = await ctx.db.get(args.clientId);
    if (!client || client.userId !== userId) {
      throw new Error("Cliente não encontrado.");
    }

    validateSessionInput(args);

    const title = args.title.trim();

    const id = await ctx.db.insert("sessions", {
      userId,
      clientId: args.clientId,
      title,
      type: cleanText(args.type),
      date: args.date,
      time: cleanText(args.time),
      location: cleanText(args.location),

      // Não use Math.max para corrigir silenciosamente entradas inválidas.
      price: args.price,
      paid: args.paid,

      status: args.status,
      notes: cleanText(args.notes),
      notifyClient: args.notifyClient,
      createdAt: Date.now(),
    });
    await logAudit(ctx, {
      userId,
      action: "session.create",
      entity: "sessions",
      entityId: id,
      summary: title,
    });
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("sessions"),
    clientId: v.id("clients"),
    title: v.string(),
    type: v.optional(v.string()),
    date: v.number(),
    time: v.optional(v.string()),
    location: v.optional(v.string()),
    price: v.number(),
    paid: v.number(),
    status: sessionStatusValidator,
    notes: v.optional(v.string()),
    notifyClient: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Não autenticado.");

    const session = await ctx.db.get(args.id);
    if (!session || session.userId !== userId) {
      throw new Error("Sessão não encontrada.");
    }

    const client = await ctx.db.get(args.clientId);
    if (!client || client.userId !== userId) {
      throw new Error("Cliente não encontrado.");
    }

    validateSessionInput(args);

    const title = args.title.trim();

    await ctx.db.patch(args.id, {
      clientId: args.clientId,
      title,
      type: cleanText(args.type),
      date: args.date,
      time: cleanText(args.time),
      location: cleanText(args.location),
      price: args.price,
      paid: args.paid,
      status: args.status,
      notes: cleanText(args.notes),
      notifyClient: args.notifyClient,
    });
    await logAudit(ctx, {
      userId,
      action: "session.update",
      entity: "sessions",
      entityId: args.id,
      summary: title,
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("sessions"),
    status: sessionStatusValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Não autenticado.");

    const session = await ctx.db.get(args.id);
    if (!session || session.userId !== userId) {
      throw new Error("Sessão não encontrada.");
    }

    await ctx.db.patch(args.id, { status: args.status });
    await logAudit(ctx, {
      userId,
      action: "session.update_status",
      entity: "sessions",
      entityId: args.id,
      summary: args.status,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Não autenticado.");

    const session = await ctx.db.get(args.id);
    if (!session || session.userId !== userId) {
      throw new Error("Sessão não encontrada.");
    }

    await ctx.db.delete(args.id);
    await logAudit(ctx, {
      userId,
      action: "session.delete",
      entity: "sessions",
      entityId: args.id,
      summary: session.title,
    });
  },
});
