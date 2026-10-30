import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

// Fotoflow is independent of Freebuff. Passwords are hashed by Convex Auth.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password({
    profile(params) {
      const email = String(params.email ?? "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
        throw new Error("Informe um e-mail válido.");
      }
      if (params.flow === "signUp") {
        const invite = process.env.FOTOFLOW_INVITE_CODE;
        if (!invite || String(params.inviteCode ?? "") !== invite) {
          throw new Error("Código de convite inválido.");
        }
        if (params.acceptedTerms !== "true") throw new Error("Aceite dos termos obrigatório.");
      }
      return params.flow === "signUp" ? { email, termsAcceptedAt: Date.now(), termsVersion: "2026-10" } : { email };
    },
    validatePasswordRequirements(password) {
      if (password.length < 12 || password.length > 128) {
        throw new Error("Use uma senha de 12 a 128 caracteres.");
      }
    },
  })],
});
