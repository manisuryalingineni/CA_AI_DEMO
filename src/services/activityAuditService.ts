import { getBusiness } from "../repositories/businessRepository";

import {
  getActivityAudit,
  insertActivityAudit,
} from "../repositories/activityAuditRepository";

import type {
  ActivityAudit,
  CreateActivityAuditInput,
} from "../types/activityAudit";

/* =========================================================
   LOG
========================================================= */

export async function logActivity(
  input: CreateActivityAuditInput,
): Promise<void> {
  try {
    let businessId = input.businessId;

    if (!businessId) {
      const business = await getBusiness();

      businessId = business?.id;
    }

    if (!businessId) {
      /*
       * Audit logging must NEVER break
       * the actual business transaction.
       */
      return;
    }

    await insertActivityAudit({
      ...input,

      businessId,
    });
  } catch (error) {
    /*
     * Important:
     * audit failure must not make
     * invoice/customer/payment save fail.
     */
    console.warn("Activity audit failed:", error);
  }
}

/* =========================================================
   LOAD
========================================================= */

export async function loadActivityAudit(): Promise<ActivityAudit[]> {
  const business = await getBusiness();

  if (!business?.id) {
    return [];
  }

  return getActivityAudit(business.id);
}
