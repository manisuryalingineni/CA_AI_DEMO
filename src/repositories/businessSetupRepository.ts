import { getDatabase } from "../database/database";

import type { BusinessSetup } from "../types/businessSetup";

type SettingsRow = {
  business_id: string;

  settings_json: string;

  updated_at: string;
};

/* =========================================================
   LOAD
========================================================= */

export async function getBusinessSetupRecord(
  businessId: string,
): Promise<BusinessSetup | null> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<SettingsRow>(
    `
        SELECT
          business_id,
          settings_json,
          updated_at

        FROM sales_pdf_settings

        WHERE business_id = ?

        LIMIT 1
      `,
    businessId,
  );

  if (!row) {
    return null;
  }

  try {
    const parsed = JSON.parse(row.settings_json) as Partial<BusinessSetup>;

    return {
      ...(parsed as BusinessSetup),

      businessId: row.business_id,

      updatedAt: row.updated_at,
    };
  } catch {
    return null;
  }
}

/* =========================================================
   SAVE
========================================================= */

export async function saveBusinessSetupRecord(
  settings: BusinessSetup,
): Promise<void> {
  const db = await getDatabase();

  const updatedAt = new Date().toISOString();

  const record: BusinessSetup = {
    ...settings,

    updatedAt,
  };

  await db.runAsync(
    `
      INSERT INTO sales_pdf_settings (
        business_id,
        settings_json,
        updated_at
      )

      VALUES (?, ?, ?)

      ON CONFLICT (business_id)

      DO UPDATE SET
        settings_json = excluded.settings_json,
        updated_at = excluded.updated_at
    `,

    settings.businessId,

    JSON.stringify(record),

    updatedAt,
  );
}

/* =========================================================
   RESET
========================================================= */

export async function deleteBusinessSetupRecord(
  businessId: string,
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
      DELETE FROM sales_pdf_settings

      WHERE business_id = ?
    `,

    businessId,
  );
}
