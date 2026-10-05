import { getDatabase } from "../database/database";

import type {
  ActivityAudit,
  CreateActivityAuditInput,
} from "../types/activityAudit";

/* =========================================================
   DATABASE ROW
========================================================= */

type ActivityRow = {
  id: string;

  business_id: string;

  module: ActivityAudit["module"];

  action: ActivityAudit["action"];

  title: string;

  details: string | null;

  actor_name: string;

  actor_role: string;

  entity_type: string | null;

  entity_id: string | null;

  metadata_json: string | null;

  created_at: string;
};

/* =========================================================
   HELPERS
========================================================= */

function createId(): string {
  return `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function mapRow(row: ActivityRow): ActivityAudit {
  let metadata: ActivityAudit["metadata"];

  if (row.metadata_json) {
    try {
      metadata = JSON.parse(row.metadata_json);
    } catch {
      metadata = undefined;
    }
  }

  return {
    id: row.id,

    businessId: row.business_id,

    module: row.module,

    action: row.action,

    title: row.title,

    details: row.details ?? undefined,

    actorName: row.actor_name,

    actorRole: row.actor_role,

    entityType: row.entity_type ?? undefined,

    entityId: row.entity_id ?? undefined,

    metadata,

    createdAt: row.created_at,
  };
}

/* =========================================================
   INSERT
========================================================= */

export async function insertActivityAudit(
  input: CreateActivityAuditInput & {
    businessId: string;
  },
): Promise<ActivityAudit> {
  const db = await getDatabase();

  const id = createId();

  const createdAt = new Date().toISOString();

  console.log("[AUDIT REPO] Inserting:", id, input.title);

  await db.runAsync(
    `
      INSERT INTO activity_audit (
        id,
        business_id,
        module,
        action,
        title,
        details,
        actor_name,
        actor_role,
        entity_type,
        entity_id,
        metadata_json,
        created_at
      )
      VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `,

    id,

    input.businessId,

    input.module,

    input.action,

    input.title.trim(),

    input.details?.trim() || null,

    input.actorName?.trim() || "Business Owner",

    input.actorRole?.trim() || "Business owner",

    input.entityType?.trim() || null,

    input.entityId?.trim() || null,

    input.metadata ? JSON.stringify(input.metadata) : null,

    createdAt,
  );

  const result: ActivityAudit = {
    id,

    businessId: input.businessId,

    module: input.module,

    action: input.action,

    title: input.title.trim(),

    details: input.details?.trim(),

    actorName: input.actorName?.trim() || "Business Owner",

    actorRole: input.actorRole?.trim() || "Business owner",

    entityType: input.entityType,

    entityId: input.entityId,

    metadata: input.metadata,

    createdAt,
  };

  console.log("[AUDIT REPO] Insert completed:", id);

  return result;
}

/* =========================================================
   LOAD
========================================================= */

export async function getActivityAudit(
  businessId: string,
): Promise<ActivityAudit[]> {
  const db = await getDatabase();

  console.log("[AUDIT REPO] Loading for business:", businessId);

  const rows = await db.getAllAsync<ActivityRow>(
    `
        SELECT
          id,
          business_id,
          module,
          action,
          title,
          details,
          actor_name,
          actor_role,
          entity_type,
          entity_id,
          metadata_json,
          created_at

        FROM activity_audit

        WHERE business_id = ?

        ORDER BY
          created_at DESC
      `,

    businessId,
  );

  console.log("[AUDIT REPO] Database row count:", rows.length);

  return rows.map(mapRow);
}
