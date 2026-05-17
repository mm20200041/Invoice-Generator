import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  throw new Error("Missing RESEND_API_KEY environment variable");
}

export const resend = new Resend(resendApiKey);

// Default sender address — update this once you verify your own domain in Resend
export const FROM_EMAIL = "onboarding@resend.dev";
