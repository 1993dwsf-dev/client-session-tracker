import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { sessionStatusValidator } from "./schema";

const cleanText = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

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

    const title = args.title.trim();
    if (!title) throw new Error("Dê um nome à sessão.");

    return await ctx.db.insert("sessions", {
      userId,
      clientId: args.clientId,
      title,
      type: cleanText(args.type),
      date: args.date,
      time: cleanText(args.time),
      location: cleanText(args.location),
      price: Math.max(0, args.price),
      paid: Math.max(0, args.paid),
      status: args.status,
      notes: cleanText(args.notes),
      notifyClient: args.notifyClient,
      createdAt: Date.now(),
    });
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

    const title = args.title.trim();
    if (!title) throw new Error("Dê um nome à sessão.");

    await ctx.db.patch(args.id, {
      clientId: args.clientId,
      title,
      type: cleanText(args.type),
      date: args.date,
      time: cleanText(args.time),
      location: cleanText(args.location),
      price: Math.max(0, args.price),
      paid: Math.max(0, args.paid),
      status: args.status,
      notes: cleanText(args.notes),
      notifyClient: args.notifyClient,
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
  },
});
