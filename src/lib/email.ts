// Email send stub. Plug a real provider (Resend / SES / Postmark) here.
// We log to stdout in dev so the magic-link can be picked up from the server logs.

export async function sendEmail(input: {
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
}): Promise<void> {
  if (process.env.NODE_ENV !== "test") {
    // eslint-disable-next-line no-console
    console.log(
      `[email-stub] -> ${input.to}\n  subject: ${input.subject}\n  ${input.bodyText.replace(/\n/g, "\n  ")}`,
    );
  }
}
