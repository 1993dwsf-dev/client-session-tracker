import { Email } from "@convex-dev/auth/providers/Email";
import axios from "axios";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";

export const emailOtp = Email({
  id: "email-otp",
  maxAge: 60 * 15, // 15 minutes
  // This function can be asynchronous
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes: Uint8Array) {
        crypto.getRandomValues(bytes);
      },
    };
    const alphabet = "0123456789";
    return generateRandomString(random, alphabet, 6);
  },
  async sendVerificationRequest({ identifier: email, token }) {
    // Secret lives in the Keys/API keys tab (OTP_EMAIL_API_KEY) — never
    // hardcoded in source. Fail loud with setup instructions instead of
    // sending an unauthenticated request that would 401 opaquely.
    const apiKey = process.env.OTP_EMAIL_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OTP_EMAIL_API_KEY não configurada: adicione a chave do serviço de e-mail na aba Keys do projeto para permitir login por código.",
      );
    }
    try {
      await axios.post(
        "https://auth.freebuff.app/send_otp",
        {
          to: email,
          otp: token,
          appName: process.env.VLY_APP_NAME || "a freebuff.com application",
        },
        {
          headers: {
            "x-api-key": apiKey,
          },
        },
      );
    } catch (error) {
      // Log server-side only. Never rethrow the raw error: an axios error
      // carries `config.headers` — including the x-api-key — and the thrown
      // message is relayed back to the client by @convex-dev/auth's signIn,
      // which would expose the key and internal request details in the UI.
      console.error(
        "[emailOtp] send verification code failed:",
        error instanceof Error ? error.message : error,
      );
      throw new Error(
        "Não foi possível enviar o código de acesso. Tente novamente em instantes.",
      );
    }
  },
});
