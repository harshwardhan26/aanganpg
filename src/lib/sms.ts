/**
 * Outbound SMS, and the one message this app sends.
 *
 * India requires every transactional sender to register a sender ID and each
 * message template on the DLT registry before a gateway will deliver anything —
 * paperwork with a lead time, not a code problem. So the send is behind
 * `SMS_API_KEY`: with the key absent, `sendSms` records what it would have sent
 * and reports `configured: false`. The reminder job then runs end to end, writes
 * nothing to the reminder counters, and can be watched in the logs long before
 * the registration clears.
 *
 * The template below is the one to register. Registered templates must match
 * what is sent, variable placeholders included, so changing this copy after
 * registration means re-registering it.
 */

import { dialablePhone } from "./phone";

export type SmsResult =
  | { sent: true }
  | { sent: false; configured: boolean; reason: string };

/**
 * The overdue-fee message.
 *
 * Pure, and asserted in `scripts/selfcheck.ts`: it is the only text this
 * business sends to a parent unprompted, and a mangled amount or a missing name
 * is a phone call to the owner.
 *
 * No link and no payment request in the body. A parent who has never heard of
 * Aangan reads an SMS with a payment link as a scam, and rightly so — this
 * message exists to tell them something, not to collect anything.
 */
export function overdueMessage(input: {
  studentName: string;
  amount: number;
  monthLabel: string;
  messName: string;
}): string {
  return (
    `${input.studentName}'s mess fee of Rs ${input.amount} for ${input.monthLabel} is still pending. ` +
    `Please pay at the mess. - ${input.messName}`
  );
}

/**
 * Sends one message, or explains why it did not.
 *
 * Never throws: the caller is a scheduled job walking a list of parents, and one
 * bad number must not stop the rest of the run.
 */
export async function sendSms(to: string | null, text: string): Promise<SmsResult> {
  const number = dialablePhone(to);
  if (!number) return { sent: false, configured: true, reason: "no usable number" };

  const apiKey = process.env.SMS_API_KEY;
  const senderId = process.env.SMS_SENDER_ID;

  if (!apiKey || !senderId) {
    // The dry run. Deliberately logged in full so the job can be verified
    // against real data before a single rupee of SMS credit is spent.
    console.log(`[sms:dry-run] to ${number}: ${text}`);
    return { sent: false, configured: false, reason: "SMS_API_KEY or SMS_SENDER_ID not set" };
  }

  try {
    const response = await fetch("https://control.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: { "Content-Type": "application/json", authkey: apiKey },
      body: JSON.stringify({
        sender: senderId,
        // The DLT-registered template id, which the gateway matches the body
        // against. Without it a request is accepted and then dropped undelivered.
        template_id: process.env.SMS_TEMPLATE_ID,
        recipients: [{ mobiles: number, message: text }],
      }),
    });

    if (!response.ok) {
      return {
        sent: false,
        configured: true,
        reason: `gateway returned ${response.status}`,
      };
    }
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      configured: true,
      reason: error instanceof Error ? error.message : "network error",
    };
  }
}
