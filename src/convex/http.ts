import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

/**
 * OAuth callback from Google: hands code+state to the action (which validates
 * the state and stores tokens), then bounces the photographer back to the app.
 */
http.route({
  path: "/api/google/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const code = url.searchParams.get("code") ?? "";
    const state = url.searchParams.get("state") ?? "";
    const error = url.searchParams.get("error");

    // The bounce target is a fixed path — never derived from request params —
    // so the 302 cannot become an open redirect. no-store keeps code+state out
    // of browser history, bfcache and intermediary caches; the other headers
    // apply baseline hardening to the only endpoint this app serves itself.
    const headers = {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    } as const;
    const redirectTo = (status: "connected" | "error") =>
      new Response(null, {
        status: 302,
        headers: {
          Location: `${url.origin}/dashboard?google=${status}`,
          ...headers,
        },
      });

    if (error || !code || !state) {
      return redirectTo("error");
    }

    let ok = false;
    try {
      const result = await ctx.runAction(
        internal.googleCalendar.oauthCallback,
        {
          code,
          state,
        },
      );
      ok = result.ok;
    } catch (err) {
      console.error("[googleCalendar] callback failed:", err);
    }

    return redirectTo(ok ? "connected" : "error");
  }),
});

export default http;
