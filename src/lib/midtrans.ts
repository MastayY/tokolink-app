/**
 * Midtrans wrapper — Snap (buyer checkout) + Iris Facilitator (seller payout).
 * SERVER-ONLY. Never import from client components.
 *
 * Production Iris key is SEPARATE from Snap server key.
 * Sandbox: both share MIDTRANS_SERVER_KEY.
 */
import midtransClient from "midtrans-client";
import { createHash } from "crypto";

const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

export const snap = new midtransClient.Snap({
  isProduction,
  serverKey: process.env.MIDTRANS_SERVER_KEY!,
  clientKey: process.env.VITE_MIDTRANS_CLIENT_KEY!,
});

export const iris = new midtransClient.Iris({
  isProduction,
  serverKey: isProduction
    ? process.env.MIDTRANS_IRIS_SERVER_KEY!
    : process.env.MIDTRANS_SERVER_KEY!,
});

export interface SnapTransactionInput {
  orderId: string;
  grossAmount: number;
  buyerName: string;
  buyerPhone: string;
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
}

export async function createSnapTransaction(
  input: SnapTransactionInput
): Promise<{ token: string; redirect_url: string }> {
  return snap.createTransaction({
    transaction_details: {
      order_id: input.orderId,
      gross_amount: input.grossAmount,
    },
    customer_details: {
      first_name: input.buyerName,
      phone: input.buyerPhone,
    },
    item_details: input.items.map((i) => ({
      id: i.id,
      price: i.price,
      quantity: i.quantity,
      name: i.name.slice(0, 50),
    })),
  });
}

export interface IrisDisbursementInput {
  beneficiaryName: string;
  beneficiaryAccount: string;
  beneficiaryBank: string;
  amount: number;
  notes: string;
}

export async function executeIrisPayout(
  input: IrisDisbursementInput
): Promise<{ reference_no: string }> {
  try {
    const result = await iris.createPayouts({
      payouts: [
        {
          beneficiary_name: input.beneficiaryName,
          beneficiary_account: input.beneficiaryAccount,
          beneficiary_bank: input.beneficiaryBank,
          beneficiary_email: "",
          amount: String(input.amount),
          notes: input.notes,
        },
      ],
    });
    const payout = result?.payouts?.[0];
    if (!payout?.reference_no) {
      throw new Error(`Iris payout failed: ${JSON.stringify(result)}`);
    }
    return { reference_no: payout.reference_no };
  } catch (err: any) {
    if (!isProduction && (err.httpStatusCode === 401 || err.message?.includes("401"))) {
      console.warn("[Iris Dev Fallback] Midtrans Iris Sandbox 401 (Iris Key not activated). Simulating payout reference in development mode.");
      return { reference_no: `IRIS-SIM-${Date.now()}` };
    }
    throw err;
  }
}

/**
 * Verify Midtrans webhook HMAC-SHA512 signature.
 * Formula: SHA512(orderId + statusCode + grossAmount + serverKey)
 * ALWAYS call this before processing any payment notification.
 */
export function verifyWebhookSignature(params: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  signatureKey: string;
}): boolean {
  const expected = createHash("sha512")
    .update(`${params.orderId}${params.statusCode}${params.grossAmount}${process.env.MIDTRANS_SERVER_KEY}`)
    .digest("hex");
  return params.signatureKey === expected;
}
