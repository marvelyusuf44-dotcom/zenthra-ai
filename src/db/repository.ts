import { randomUUID } from "crypto";
import { ensureMigrated } from "@/src/db/client";

/**
 * Repository pattern: every payment/subscription DB access goes through
 * this file. Function names/signatures are unchanged from the original
 * SQLite-only version — every function is now `async` (returns a Promise)
 * because the Postgres backend (src/db/client.ts) is network I/O, but the
 * public contract callers depend on is otherwise identical. This is the
 * single place that knows about SQL; it never imports better-sqlite3 or pg
 * directly (see src/db/adapter.ts / src/db/client.ts).
 */

export interface Plan {
  id: string;
  name: string;
  price_idr: number;
  period_days: number;
  description: string | null;
  active: number;
}

export interface Order {
  id: string;
  user_id: string;
  plan_id: string;
  amount_idr: number;
  status: "PENDING_PROOF" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  proof_file_path: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface PaymentProof {
  order_id: string;
  filename: string;
  mime_type: string;
  byte_size: number;
  data_base64: string;
  created_at: string;
}

export interface PaymentProofInput {
  filename: string;
  mimeType: string;
  byteSize: number;
  dataBase64: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  order_id: string;
  status: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
}

export async function listActivePlans(): Promise<Plan[]> {
  const db = await ensureMigrated();
  return db.all<Plan>("SELECT * FROM plans WHERE active = 1");
}

export async function getPlan(planId: string): Promise<Plan | undefined> {
  const db = await ensureMigrated();
  return db.get<Plan>("SELECT * FROM plans WHERE id = ?", [planId]);
}

export async function upsertUser(userId: string, email?: string, displayName?: string): Promise<void> {
  const db = await ensureMigrated();
  const existing = await db.get<{ id: string }>("SELECT id FROM users WHERE id = ?", [userId]);
  if (!existing) {
    await db.run(
      "INSERT INTO users (id, email, display_name, created_at) VALUES (?, ?, ?, ?)",
      [userId, email ?? null, displayName ?? null, new Date().toISOString()]
    );
  }
}

export async function createOrder(userId: string, planId: string): Promise<Order> {
  const plan = await getPlan(planId);
  if (!plan) throw new Error(`Unknown plan: ${planId}`);
  if (!plan.active || plan.price_idr <= 0) {
    throw new Error(`Plan ${planId} is not currently purchasable (not priced/active).`);
  }

  const db = await ensureMigrated();
  const now = new Date().toISOString();
  const order: Order = {
    id: randomUUID(),
    user_id: userId,
    plan_id: planId,
    amount_idr: plan.price_idr,
    status: "PENDING_PROOF",
    proof_file_path: null,
    admin_note: null,
    created_at: now,
    updated_at: now,
    reviewed_by: null,
    reviewed_at: null,
  };

  await db.run(
    `INSERT INTO orders (id, user_id, plan_id, amount_idr, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [order.id, order.user_id, order.plan_id, order.amount_idr, order.status, order.created_at, order.updated_at]
  );

  return order;
}

export async function getOrder(orderId: string): Promise<Order | undefined> {
  const db = await ensureMigrated();
  return db.get<Order>("SELECT * FROM orders WHERE id = ?", [orderId]);
}

export async function attachProof(orderId: string, proof: PaymentProofInput): Promise<Order> {
  const db = await ensureMigrated();
  const now = new Date().toISOString();

  await db.run(
    `INSERT INTO payment_proofs (order_id, filename, mime_type, byte_size, data_base64, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(order_id) DO UPDATE SET
       filename = excluded.filename,
       mime_type = excluded.mime_type,
       byte_size = excluded.byte_size,
       data_base64 = excluded.data_base64,
       created_at = excluded.created_at`,
    [
      orderId,
      proof.filename,
      proof.mimeType,
      proof.byteSize,
      proof.dataBase64,
      now,
    ]
  );

  await db.run(
    `UPDATE orders SET proof_file_path = ?, status = 'PENDING_REVIEW', updated_at = ? WHERE id = ?`,
    [proof.filename, now, orderId]
  );
  const updated = await getOrder(orderId);
  if (!updated) throw new Error("Order not found after update");
  return updated;
}

export async function getPaymentProof(orderId: string): Promise<PaymentProof | undefined> {
  const db = await ensureMigrated();
  return db.get<PaymentProof>(
    "SELECT order_id, filename, mime_type, byte_size, data_base64, created_at FROM payment_proofs WHERE order_id = ?",
    [orderId]
  );
}

export async function reviewOrder(
  orderId: string,
  decision: "APPROVED" | "REJECTED",
  actor: string,
  note?: string
): Promise<Order> {
  const db = await ensureMigrated();
  const now = new Date().toISOString();
  const order = await getOrder(orderId);
  if (!order) throw new Error(`Order ${orderId} not found`);
  if (order.status !== "PENDING_REVIEW") {
    throw new Error(`Order ${orderId} is not pending review (status: ${order.status})`);
  }

  await db.run(
    `UPDATE orders SET status = ?, admin_note = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?`,
    [decision, note ?? null, actor, now, now, orderId]
  );

  await db.run(
    `INSERT INTO admin_actions_log (id, order_id, action, actor, note, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [randomUUID(), orderId, decision, actor, note ?? null, now]
  );

  if (decision === "APPROVED") {
    const plan = await getPlan(order.plan_id);
    if (!plan) throw new Error(`Plan ${order.plan_id} missing while approving order`);
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + plan.period_days * 24 * 60 * 60 * 1000);
    await db.run(
      `INSERT INTO subscriptions (id, user_id, plan_id, order_id, status, starts_at, ends_at, created_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?, ?)`,
      [randomUUID(), order.user_id, order.plan_id, order.id, startsAt.toISOString(), endsAt.toISOString(), now]
    );
  }

  const updated = await getOrder(orderId);
  if (!updated) throw new Error("Order not found after review");
  return updated;
}

export async function getActiveSubscription(userId: string): Promise<Subscription | undefined> {
  const db = await ensureMigrated();
  const now = new Date().toISOString();
  return db.get<Subscription>(
    `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' AND ends_at > ? ORDER BY ends_at DESC LIMIT 1`,
    [userId, now]
  );
}

export async function listOrdersByStatus(status: Order["status"]): Promise<Order[]> {
  const db = await ensureMigrated();
  return db.all<Order>("SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC", [status]);
}

export interface RevenueStats {
  totalApprovedOrders: number;
  totalRevenueIdr: number;
  pendingReviewCount: number;
  activeSubscriptions: number;
}

export async function getRevenueStats(): Promise<RevenueStats> {
  const db = await ensureMigrated();
  const approved = await db.get<{ c: number; total: number }>(
    "SELECT COUNT(*) as c, COALESCE(SUM(amount_idr),0) as total FROM orders WHERE status = 'APPROVED'"
  );
  const pending = await db.get<{ c: number }>(
    "SELECT COUNT(*) as c FROM orders WHERE status = 'PENDING_REVIEW'"
  );
  const active = await db.get<{ c: number }>(
    "SELECT COUNT(*) as c FROM subscriptions WHERE status = 'active' AND ends_at > ?",
    [new Date().toISOString()]
  );

  return {
    totalApprovedOrders: Number(approved?.c ?? 0),
    totalRevenueIdr: Number(approved?.total ?? 0),
    pendingReviewCount: Number(pending?.c ?? 0),
    activeSubscriptions: Number(active?.c ?? 0),
  };
}
