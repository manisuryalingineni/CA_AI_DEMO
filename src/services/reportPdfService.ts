import { Platform } from "react-native";

import * as Print from "expo-print";

import * as FileSystem from "expo-file-system/legacy";

import type { ReportData, ReportField } from "../types/report";

/*         =
   HELPERS
        = */

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatMoney(value: unknown): string {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatValue(value: unknown, field: ReportField): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  switch (field.format) {
    case "money":
      return formatMoney(value);

    case "number":
      return Number(value).toLocaleString("en-IN");

    default:
      return String(value);
  }
}

function safeFileName(value: string): string {
  const cleaned = value
    .trim()
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 70);

  return cleaned || "Business_Report";
}

/*         =
   GENERIC REPORT HTML
        = */

function buildGenericReportHtml(report: ReportData): string {
  const records = report.rows
    .map((row, rowIndex) => {
      const cells = report.fields
        .map(
          (field) => `
                  <div class="field">
                    <div class="field-label">
                      ${escapeHtml(field.label)}
                    </div>

                    <div class="field-value">
                      ${escapeHtml(formatValue(row.values[field.key], field))}
                    </div>
                  </div>
                `,
        )
        .join("");

      return `
            <section class="record">
              ${
                report.rows.length > 1
                  ? `
                    <div class="record-heading">
                      Record ${rowIndex + 1}
                    </div>
                  `
                  : ""
              }

              <div class="field-grid">
                ${cells}
              </div>
            </section>
          `;
    })
    .join("");

  const summary =
    report.summaryLabel && report.summaryValue !== undefined
      ? `
        <div class="summary">
          <span>
            ${escapeHtml(report.summaryLabel)}
          </span>

          <strong>
            ${escapeHtml(formatMoney(report.summaryValue))}
          </strong>
        </div>
      `
      : "";

  return `
<!DOCTYPE html>

<html>
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <style>
    @page {
      size: A4;
      margin: 24px;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 0;

      font-family:
        Arial,
        Helvetica,
        sans-serif;

      color: #152737;

      background: #ffffff;
    }

    .page {
      width: 100%;
    }

    .topbar {
      background: #073b5c;

      color: #ffffff;

      border-radius: 12px;

      padding: 18px 20px;

      margin-bottom: 16px;
    }

    .brand {
      font-size: 22px;

      font-weight: 800;
    }

    .business {
      margin-top: 4px;

      font-size: 11px;

      color: #d6e7ef;
    }

    .report-title {
      margin-top: 20px;

      font-size: 26px;

      font-weight: 800;

      color: #14293a;
    }

    .report-subtitle {
      margin-top: 5px;

      margin-bottom: 18px;

      font-size: 11px;

      color: #71818b;
    }

    .record {
      border: 1px solid #dbe5e9;

      border-radius: 12px;

      overflow: hidden;

      margin-bottom: 12px;

      page-break-inside: avoid;
    }

    .record-heading {
      background: #eaf5f6;

      padding: 8px 11px;

      font-size: 9px;

      font-weight: 800;

      color: #53717c;

      text-transform: uppercase;
    }

    .field-grid {
      display: grid;

      grid-template-columns:
        1fr 1fr;
    }

    .field {
      min-height: 62px;

      padding: 10px 12px;

      border-right:
        1px solid #e8eef0;

      border-bottom:
        1px solid #e8eef0;
    }

    .field:nth-child(even) {
      border-right: 0;
    }

    .field-label {
      font-size: 8px;

      font-weight: 700;

      color: #667984;

      text-transform: uppercase;

      letter-spacing: 0.3px;
    }

    .field-value {
      margin-top: 5px;

      font-size: 12px;

      font-weight: 700;

      color: #182c3a;

      word-break: break-word;
    }

    .summary {
      margin-top: 14px;

      padding: 14px 16px;

      background: #e8f6fb;

      border: 1px solid #bcdfea;

      border-radius: 10px;

      display: flex;

      align-items: center;

      justify-content:
        space-between;

      font-size: 13px;

      color: #145b76;
    }

    .summary strong {
      color: #123949;

      font-size: 15px;
    }

    .empty {
      border: 1px solid #dce5e9;

      border-radius: 12px;

      padding: 30px;

      text-align: center;

      color: #71818b;
    }

    .footer {
      margin-top: 25px;

      padding-top: 10px;

      border-top:
        1px solid #e4e9eb;

      font-size: 8px;

      color: #8a969c;

      text-align: center;
    }
  </style>
</head>

<body>
  <main class="page">

    <header class="topbar">
      <div class="brand">
        CA AI Business
      </div>

      <div class="business">
        Retail Shop • Business Report
      </div>
    </header>

    <div class="report-title">
      ${escapeHtml(report.title)}
    </div>

    <div class="report-subtitle">
      ${escapeHtml(report.subtitle)}
    </div>

    ${
      records ||
      `
        <div class="empty">
          ${escapeHtml(report.emptyMessage || "No records available.")}
        </div>
      `
    }

    ${summary}

    <footer class="footer">
      Computer-generated report from CA AI Business.
    </footer>

  </main>
</body>
</html>
`;
}

/*         =
   PROFIT / LOSS HTML
        = */

function buildProfitLossHtml(report: ReportData): string {
  const first = report.rows[0];

  const sales = Number(first?.values?.sales || 0);

  const purchases = Number(first?.values?.purchases || 0);

  const result = Number(first?.values?.result || 0);

  const positive = result >= 0;

  return `
<!DOCTYPE html>

<html>
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <style>
    @page {
      size: A4;
      margin: 26px;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;

      font-family:
        Arial,
        Helvetica,
        sans-serif;

      color: #152735;

      background: #ffffff;
    }

    .header {
      background: #073b5c;

      border-radius: 14px;

      color: #ffffff;

      padding: 22px;

      margin-bottom: 22px;
    }

    .brand {
      font-size: 25px;

      font-weight: 800;
    }

    .business {
      margin-top: 5px;

      color: #d9ebf2;

      font-size: 11px;
    }

    .title-row {
      display: flex;

      align-items: flex-end;

      justify-content:
        space-between;

      margin-bottom: 18px;
    }

    .title {
      font-size: 27px;

      font-weight: 800;
    }

    .subtitle {
      margin-top: 4px;

      font-size: 11px;

      color: #74828b;
    }

    .badge {
      padding: 8px 12px;

      border-radius: 8px;

      background: #e5f6f2;

      color: #087d73;

      font-size: 10px;

      font-weight: 800;
    }

    .cards {
      display: grid;

      grid-template-columns:
        1fr 1fr;

      gap: 12px;

      margin-bottom: 18px;
    }

    .metric {
      min-height: 95px;

      border-radius: 13px;

      background: #f5f9fa;

      border: 1px solid #dfe8eb;

      padding: 18px;
    }

    .metric-label {
      color: #71818b;

      font-size: 10px;

      font-weight: 700;

      text-transform: uppercase;
    }

    .metric-value {
      margin-top: 9px;

      color: #14293a;

      font-size: 23px;

      font-weight: 800;
    }

    .result {
      padding: 20px;

      border-radius: 14px;

      background:
        ${positive ? "#e5f7ef" : "#fff0ed"};

      border:
        1px solid
        ${positive ? "#b9dfcf" : "#efc9c0"};

      margin-bottom: 18px;
    }

    .result-label {
      font-size: 11px;

      font-weight: 700;

      color:
        ${positive ? "#24755c" : "#a15340"};
    }

    .result-value {
      margin-top: 5px;

      font-size: 30px;

      font-weight: 900;

      color:
        ${positive ? "#176b51" : "#994832"};
    }

    .note {
      border: 1px solid #dce6e9;

      border-radius: 12px;

      padding: 15px;

      font-size: 10px;

      line-height: 16px;

      color: #667680;
    }

    .footer {
      margin-top: 28px;

      padding-top: 12px;

      border-top:
        1px solid #e3e9ec;

      text-align: center;

      color: #8b969d;

      font-size: 8px;
    }
  </style>
</head>

<body>

  <header class="header">
    <div class="brand">
      Retail Shop
    </div>

    <div class="business">
      CA AI Business • Financial Report
    </div>
  </header>

  <section class="title-row">

    <div>
      <div class="title">
        Profit & Loss
      </div>

      <div class="subtitle">
        Live saved business data
      </div>
    </div>

    <div class="badge">
      BOOK RESULT
    </div>

  </section>

  <section class="cards">

    <div class="metric">

      <div class="metric-label">
        Net sales
      </div>

      <div class="metric-value">
        ${formatMoney(sales)}
      </div>

    </div>

    <div class="metric">

      <div class="metric-label">
        Net purchases
      </div>

      <div class="metric-value">
        ${formatMoney(purchases)}
      </div>

    </div>

  </section>

  <section class="result">

    <div class="result-label">
      ${positive ? "BOOK PROFIT" : "BOOK LOSS"}
    </div>

    <div class="result-value">
      ${formatMoney(result)}
    </div>

  </section>

  <section class="note">
    This report currently calculates the book result from
    sales less purchases.

    Expenses, depreciation, other income and tax adjustments
    should be included when those ledgers are implemented.
  </section>

  <footer class="footer">
    Computer-generated document from CA AI Business.
  </footer>

</body>
</html>
`;
}

/*         =
   BUILD HTML
        = */

export function buildReportHtml(report: ReportData): string {
  if (report.id === "profit-loss") {
    return buildProfitLossHtml(report);
  }

  return buildGenericReportHtml(report);
}

/*         =
   RESULT
        = */

export type SavePdfResult = {
  saved: boolean;

  cancelled: boolean;

  uri?: string;

  fileName?: string;
};

/*         =
   SAVE REPORT PDF
        = */

export async function saveReportPdf(
  report: ReportData,
): Promise<SavePdfResult> {
  const html = buildReportHtml(report);

  /*        ======
     CREATE PDF + BASE64

     This is important.

     We ask expo-print for base64 directly instead
     of creating the PDF and reading it again later.
         ====== */

  const generated = await Print.printToFileAsync({
    html,

    base64: true,
  });

  if (!generated.uri) {
    throw new Error("PDF generation failed.");
  }

  if (!generated.base64) {
    throw new Error("PDF data could not be generated.");
  }

  /*        ======
     FILE NAME
         ====== */

  const now = new Date();

  const datePart = now.toISOString().slice(0, 10);

  const timePart = now.toTimeString().slice(0, 8).replace(/:/g, "-");

  const fileBaseName = `${safeFileName(report.title)}_${datePart}_${timePart}`;

  const visibleFileName = `${fileBaseName}.pdf`;

  /*        ======
     ANDROID
         ====== */

  if (Platform.OS === "android") {
    const SAF = FileSystem.StorageAccessFramework;

    /*        ====
       SELECT DESTINATION FOLDER
           ==== */

    const permission = await SAF.requestDirectoryPermissionsAsync();

    if (!permission.granted) {
      return {
        saved: false,

        cancelled: true,
      };
    }

    /*        ====
       CREATE EMPTY PDF FILE

       Expo expects filename WITHOUT extension.
           ==== */

    let destinationUri: string;

    try {
      destinationUri = await SAF.createFileAsync(
        permission.directoryUri,

        fileBaseName,

        "application/pdf",
      );
    } catch (error) {
      console.error("SAF createFileAsync failed:", error);

      throw new Error(
        "Could not create the PDF file in that folder. Please select Downloads or Documents and try again.",
      );
    }

    if (!destinationUri) {
      throw new Error("Android did not return a destination file.");
    }

    /*        ====
       WRITE BASE64 PDF

       Important:
       writeAsStringAsync is called on FileSystem,
       not StorageAccessFramework.

       Expo documents that writeAsStringAsync supports
       an existing SAF URI.
           ==== */

    try {
      await FileSystem.writeAsStringAsync(
        destinationUri,

        generated.base64,

        {
          encoding: FileSystem.EncodingType.Base64,
        },
      );
    } catch (error) {
      console.error("PDF write failed:", error);

      throw new Error(
        "The file was created but the PDF data could not be written.",
      );
    }

    /*        ====
       VERIFY SAVED FILE

       getInfoAsync supports content:// / SAF URIs.
           ==== */

    try {
      const info = await FileSystem.getInfoAsync(destinationUri);

      if (!info.exists) {
        throw new Error("Saved PDF could not be verified.");
      }

      if ("size" in info && typeof info.size === "number" && info.size <= 0) {
        throw new Error("Saved PDF is empty.");
      }
    } catch (error) {
      console.warn("PDF verification warning:", error);

      /*
       * Do not automatically mark the save
       * as failed here because some Android
       * document providers expose limited
       * metadata for content:// URIs.
       */
    }

    return {
      saved: true,

      cancelled: false,

      uri: destinationUri,

      fileName: visibleFileName,
    };
  }

  /*        ======
     IOS
         ====== */

  if (Platform.OS === "ios") {
    const documentDirectory = FileSystem.documentDirectory;

    if (!documentDirectory) {
      throw new Error("Documents directory is unavailable.");
    }

    const destinationUri = `${documentDirectory}${visibleFileName}`;

    await FileSystem.writeAsStringAsync(
      destinationUri,

      generated.base64,

      {
        encoding: FileSystem.EncodingType.Base64,
      },
    );

    const info = await FileSystem.getInfoAsync(destinationUri);

    if (!info.exists) {
      throw new Error("PDF was not saved.");
    }

    return {
      saved: true,

      cancelled: false,

      uri: destinationUri,

      fileName: visibleFileName,
    };
  }

  /*        ======
     WEB
         ====== */

  await Print.printAsync({
    html,
  });

  return {
    saved: true,

    cancelled: false,

    fileName: visibleFileName,
  };
}

/*         =
   PRINT REPORT
        = */

export async function printReport(report: ReportData): Promise<void> {
  await Print.printAsync({
    html: buildReportHtml(report),
  });
}
