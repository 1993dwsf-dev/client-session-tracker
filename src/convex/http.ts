import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
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

    if (error || !code || !state) {
      return new Response(null, {
        status: 302,
        headers: { Location: `${url.origin}/dashboard?google=error` },
      });
    }

    let ok = false;
    try {
      const result = await ctx.runAction(api.googleCalendar.oauthCallback, {
        code,
        state,
        origin: url.origin,
      });
      ok = result.ok;
    } catch (err) {
      console.error("[googleCalendar] callback failed:", err);
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: `${url.origin}/dashboard?google=${ok ? "connected" : "error"}`,
      },
    });
  }),
});

export default http;
