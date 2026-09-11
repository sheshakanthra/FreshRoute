import "server-only";
import { db } from "../db";
import { actionType } from "@/db/schema";

/** All six recovery actions with their evidence tier — used to populate the
 * Override picker (must be a real action_type.code, never free text). */
export async function listActionTypes() {
  return db.select().from(actionType);
}
