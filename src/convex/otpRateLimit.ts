import { ConvexError, v } from "convex/values";
import { internalMutation, type MutationCtx } from "./_generated/server";

/**
 * Rate limiting for OTP *sends* (the email provider).
 *
 * @convex-dev/auth already throttles code *verification* failures
 * (`authRateLimits`, 10 failures/hour), but nothing limited how often a code
 * could be requested. Without this, the email relay could be used as a spam
 * cannon against arbitrary addresses and burn the shared sending quota.
 *
 * The provider runs inside an action ctx, so it calls this internal mutation.
 * We cap both per-address and globally: the per-address window stops someone
 * hammering one inbox, the global window caps total outbound mail even if an
 * attacker rotates addresses (we have no client IP to key on here).
 */
const PER_EMAIL_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const PER_EMAIL_MAX = 3;
const GLOBAL_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const GLOBAL_MAX = 100;

function freshWindow(windowStart: number, windowMs: number, now: number) {
  return now - windowStart >= windowMs;
}

/** Records one hit on `key`, throwing if the window's cap is already reached. */
async function consumeWindow(
  ctx: MutationCtx,
  key: string,
  windowMs: number,
  max: number,
  now: number,
) {
  const existing = await ctx.db
    .query("otpSendRateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();

  const expired = !existing || freshWindow(existing.windowStart, windowMs, now);
  const count = expired ? 0 : existing.count;

  if (count >= max) {
    throw new ConvexError(
      "Muitas solicitações de código foram feitas. Aguarde alguns minutos e tente novamente.",
    );
  }

  if (expired) {
    if (existing) {
      await ctx.db.patch(existing._id, { windowStart: now, count: 1 });
    } else {
      await ctx.db.insert("otpSendRateLimits", {
        key,
        windowStart: now,
        count: 1,
      });
    }
  } else {
    await ctx.db.patch(existing._id, { count: count + 1 });
  }
}

export const consumeOtpSend = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const now = Date.now();
    const normalized = email.trim().toLowerCase();
    // Per-address first so the specific message surfaces before the global cap.
    await consumeWindow(ctx, `email:${normalized}`, PER_EMAIL_WINDOW_MS, PER_EMAIL_MAX, now);
    await consumeWindow(ctx, "global", GLOBAL_WINDOW_MS, GLOBAL_MAX, now);
  },
});

export const cleanupExpiredOtpSendRateLimits = internalMutation({
  args: {},

  handler: async (ctx) => {
    // As janelas de uso da aplicação duram até uma hora.
    // Manter margem de 24 horas evita remover registros recentes.
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;

    const rows = await ctx.db
      .query("otpSendRateLimits")
      .withIndex("by_window", (q) =>
        q.lt("windowStart", cutoff),
      )
      .take(500);

    for (const row of rows) {
      await ctx.db.delete(row._id);
    }

    return {
      deleted: rows.length,
    };
  },
});
