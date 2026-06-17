import "server-only";

import ExcelJS from "exceljs";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ReportData } from "@/modules/reports/data";

/**
 * Exporters: each turns a `ReportData` into a downloadable `Response`.
 * Format-specific only — all report semantics live in data.ts.
 */

/** "Attendance Report — CSE-1A" → "attendance-report-cse-1a" */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function csvEscape(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(report: ReportData): Response {
  const header = report.columns.map((c) => csvEscape(c.header)).join(",");
  const lines = report.rows.map((row) =>
    report.columns.map((c) => csvEscape(row[c.key] ?? "")).join(","),
  );
  const csv = [header, ...lines].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slugify(report.title)}.csv"`,
    },
  });
}

export async function toXlsx(report: ReportData): Promise<Response> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(report.title.slice(0, 31));

  worksheet.columns = report.columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width ?? 20,
  }));
  worksheet.addRows(report.rows);
  worksheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${slugify(report.title)}.xlsx"`,
    },
  });
}

const MAX_PDF_ROWS = 1000;

export async function toPdf(report: ReportData): Promise<Response> {
  const rows = report.rows.slice(0, MAX_PDF_ROWS);

  const headerRow = React.createElement(
    View,
    {
      style: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#000",
      },
    },
    ...report.columns.map((c) =>
      React.createElement(
        Text,
        {
          key: c.key,
          style: { flex: 1, padding: 2, fontFamily: "Helvetica-Bold" },
        },
        c.header,
      ),
    ),
  );

  const dataRows = rows.map((row, i) =>
    React.createElement(
      View,
      {
        key: i,
        style: {
          flexDirection: "row",
          borderBottomWidth: 0.5,
          borderBottomColor: "#ddd",
        },
      },
      ...report.columns.map((c) =>
        React.createElement(
          Text,
          { key: c.key, style: { flex: 1, padding: 2 } },
          String(row[c.key] ?? ""),
        ),
      ),
    ),
  );

  const doc = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      {
        size: "A4",
        orientation: "landscape",
        style: { padding: 24, fontSize: 9 },
      },
      React.createElement(
        Text,
        {
          style: {
            fontSize: 14,
            marginBottom: 12,
            fontFamily: "Helvetica-Bold",
          },
        },
        report.title,
      ),
      headerRow,
      ...dataRows,
    ),
  );

  const buffer = await renderToBuffer(doc);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slugify(report.title)}.pdf"`,
    },
  });
}
