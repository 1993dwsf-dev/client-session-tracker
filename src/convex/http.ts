import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

function getFrontendOrigin(): string {
  const configuredUrl = process.env.SITE_URL;

  if (!configuredUrl) {
    throw new Error("SITE_URL não está configurada.");
  }

  const parsedUrl = new URL(configuredUrl);

  const isLocalhost =
    parsedUrl.hostname === "localhost" ||
    parsedUrl.hostname === "127.0.0.1";

  if (parsedUrl.protocol !== "https:" && !isLocalhost) {
    throw new Error("SITE_URL deve usar HTTPS em produção.");
  }

  return parsedUrl.origin;
}

/**
 * Callback OAuth do Google.
 *
 * O destino é a origem pública configurada no servidor, nunca um parâmetro
 * recebido da requisição. Isso evita transformar o callback em open redirect.
 */
http.route({
  path: "/api/google/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);

    const code = url.searchParams.get("code") ?? "";
    const state = url.searchParams.get("state") ?? "";
    const oauthError = url.searchParams.get("error");

    const headers = {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    };

    let frontendOrigin: string;

    try {
      frontendOrigin = getFrontendOrigin();
    } catch (error) {
      console.error(
        "[googleCalendar] frontend URL configuration error:",
        error instanceof Error ? error.message : "Unknown error",
      );

      return new Response("Frontend URL is not configured.", {
        status: 500,
        headers,
      });
    }

    const redirectTo = (status: "connected" | "error") => {
      const destination = new URL("/dashboard", frontendOrigin);

      destination.searchParams.set("google", status);

      return new Response(null, {
        status: 302,
        headers: {
          ...headers,
          Location: destination.toString(),
        },
      });
    };

    if (oauthError || !code || !state) {
      return redirectTo("error");
    }

    try {
      const result = await ctx.runAction(
        internal.googleCalendar.oauthCallback,
        {
          code,
          state,
        },
      );

      return redirectTo(result.ok ? "connected" : "error");
    } catch (error) {
      console.error(
        "[googleCalendar] callback failed:",
        error instanceof Error ? error.message : "Unknown error",
      );

      return redirectTo("error");
    }
  }),
});

export default http;
