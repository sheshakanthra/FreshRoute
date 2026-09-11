import "server-only";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { commodity } from "@/db/schema";

export async function getCommodityByCode(code: string) {
  const rows = await db.select().from(commodity).where(eq(commodity.code, code)).limit(1);
  return rows[0] ?? null;
}
