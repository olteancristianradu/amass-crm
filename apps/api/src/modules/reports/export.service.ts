/**
 * Export service for generating PDF and Excel reports.
 * Uses pdfkit for PDF generation and exceljs for XLSX generation.
 */

import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { prisma } from '../../config/database';

// ─── Types ───

interface DealFilters {
  pipelineId?: string;
  stageId?: string;
  assignedToId?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface ContactFilters {
  companyId?: string;
  assignedToId?: string;
  source?: string;
  tag?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface ReportData {
  type: string;
  data: unknown;
}

// ─── Deal Exports ───

export async function exportDealsPdf(tenantId: string, filters: DealFilters): Promise<Buffer> {
  const deals = await fetchDeals(tenantId, filters);

  // Compute summary stats
  const totalValue = deals.reduce((sum, d) => sum + Number(d.value), 0);
  const wonDeals = deals.filter((d) => d.wonAt !== null);
  const lostDeals = deals.filter((d) => d.lostAt !== null);
  const openDeals = deals.filter((d) => d.wonAt === null && d.lostAt === null);
  const wonValue = wonDeals.reduce((sum, d) => sum + Number(d.value), 0);
  const lostValue = lostDeals.reduce((sum, d) => sum + Number(d.value), 0);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Title
    doc.fontSize(20).font('Helvetica-Bold').text('Deal Pipeline Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#666666')
      .text(`Generated on ${new Date().toISOString().split('T')[0]} | Amass CRM`, { align: 'center' });
    doc.moveDown(1.5);

    // Summary section
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000').text('Summary');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#333333');
    doc.text(`Total Deals: ${deals.length}`);
    doc.text(`Total Value: ${formatCurrency(totalValue)}`);
    doc.text(`Open Deals: ${openDeals.length} (${formatCurrency(openDeals.reduce((s, d) => s + Number(d.value), 0))})`);
    doc.text(`Won Deals: ${wonDeals.length} (${formatCurrency(wonValue)})`);
    doc.text(`Lost Deals: ${lostDeals.length} (${formatCurrency(lostValue)})`);
    if (wonDeals.length + lostDeals.length > 0) {
      const winRate = Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100);
      doc.text(`Win Rate: ${winRate}%`);
    }
    doc.moveDown(1.5);

    // Pipeline breakdown by stage
    const stageMap = new Map<string, { name: string; count: number; value: number }>();
    for (const deal of deals) {
      const stageName = deal.stage?.name || 'Unknown';
      const existing = stageMap.get(stageName) || { name: stageName, count: 0, value: 0 };
      existing.count += 1;
      existing.value += Number(deal.value);
      stageMap.set(stageName, existing);
    }

    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000').text('Pipeline Breakdown');
    doc.moveDown(0.5);

    // Simple table
    const tableTop = doc.y;
    const colWidths = [200, 80, 150];
    const headers = ['Stage', 'Deals', 'Value'];

    // Header row
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000');
    let xPos = 50;
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], xPos, tableTop, { width: colWidths[i] });
      xPos += colWidths[i];
    }
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(50 + colWidths.reduce((a, b) => a + b, 0), doc.y).stroke('#cccccc');
    doc.moveDown(0.3);

    // Data rows
    doc.font('Helvetica').fontSize(9).fillColor('#333333');
    for (const [, stageInfo] of stageMap) {
      xPos = 50;
      const rowY = doc.y;
      doc.text(stageInfo.name, xPos, rowY, { width: colWidths[0] });
      doc.text(String(stageInfo.count), xPos + colWidths[0], rowY, { width: colWidths[1] });
      doc.text(formatCurrency(stageInfo.value), xPos + colWidths[0] + colWidths[1], rowY, { width: colWidths[2] });
      doc.moveDown(0.5);
    }

    // Deal list table
    if (deals.length > 0) {
      doc.moveDown(1);
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000').text('Deal List');
      doc.moveDown(0.5);

      const listHeaders = ['Title', 'Value', 'Stage', 'Assigned To'];
      const listColWidths = [160, 100, 120, 120];

      doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000');
      xPos = 50;
      const listTop = doc.y;
      for (let i = 0; i < listHeaders.length; i++) {
        doc.text(listHeaders[i], xPos, listTop, { width: listColWidths[i] });
        xPos += listColWidths[i];
      }
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(50 + listColWidths.reduce((a, b) => a + b, 0), doc.y).stroke('#cccccc');
      doc.moveDown(0.3);

      doc.font('Helvetica').fontSize(8).fillColor('#333333');
      for (const deal of deals.slice(0, 100)) {
        if (doc.y > 720) {
          doc.addPage();
        }
        const rowY = doc.y;
        xPos = 50;
        doc.text(deal.title, xPos, rowY, { width: listColWidths[0], ellipsis: true });
        doc.text(formatCurrency(Number(deal.value)), xPos + listColWidths[0], rowY, { width: listColWidths[1] });
        doc.text(deal.stage?.name || '-', xPos + listColWidths[0] + listColWidths[1], rowY, { width: listColWidths[2] });
        doc.text(deal.assignedTo?.name || '-', xPos + listColWidths[0] + listColWidths[1] + listColWidths[2], rowY, { width: listColWidths[3] });
        doc.moveDown(0.5);
      }

      if (deals.length > 100) {
        doc.moveDown(0.5);
        doc.fontSize(8).fillColor('#999999').text(`... and ${deals.length - 100} more deals`);
      }
    }

    doc.end();
  });
}

export async function exportDealsExcel(tenantId: string, filters: DealFilters): Promise<Buffer> {
  const deals = await fetchDeals(tenantId, filters);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Amass CRM';
  workbook.created = new Date();

  // Summary sheet
  const summarySheet = workbook.addWorksheet('Summary');
  const totalValue = deals.reduce((sum, d) => sum + Number(d.value), 0);
  const wonDeals = deals.filter((d) => d.wonAt !== null);
  const lostDeals = deals.filter((d) => d.lostAt !== null);
  const openDeals = deals.filter((d) => d.wonAt === null && d.lostAt === null);

  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 25 },
    { header: 'Value', key: 'value', width: 25 },
  ];
  styleHeaderRow(summarySheet);

  summarySheet.addRow({ metric: 'Total Deals', value: deals.length });
  summarySheet.addRow({ metric: 'Total Value', value: totalValue });
  summarySheet.addRow({ metric: 'Open Deals', value: openDeals.length });
  summarySheet.addRow({ metric: 'Won Deals', value: wonDeals.length });
  summarySheet.addRow({ metric: 'Lost Deals', value: lostDeals.length });
  if (wonDeals.length + lostDeals.length > 0) {
    const winRate = Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100);
    summarySheet.addRow({ metric: 'Win Rate', value: `${winRate}%` });
  }

  // Deals sheet
  const dealsSheet = workbook.addWorksheet('Deals');
  dealsSheet.columns = [
    { header: 'Title', key: 'title', width: 30 },
    { header: 'Value', key: 'value', width: 15 },
    { header: 'Currency', key: 'currency', width: 10 },
    { header: 'Pipeline', key: 'pipeline', width: 20 },
    { header: 'Stage', key: 'stage', width: 20 },
    { header: 'Assigned To', key: 'assignedTo', width: 20 },
    { header: 'Company', key: 'company', width: 20 },
    { header: 'Source', key: 'source', width: 15 },
    { header: 'Expected Close', key: 'expectedClose', width: 15 },
    { header: 'Won At', key: 'wonAt', width: 15 },
    { header: 'Lost At', key: 'lostAt', width: 15 },
    { header: 'Created At', key: 'createdAt', width: 15 },
  ];
  styleHeaderRow(dealsSheet);

  for (const deal of deals) {
    dealsSheet.addRow({
      title: deal.title,
      value: Number(deal.value),
      currency: deal.currency,
      pipeline: deal.pipeline?.name || '',
      stage: deal.stage?.name || '',
      assignedTo: deal.assignedTo?.name || '',
      company: deal.company?.name || '',
      source: deal.source,
      expectedClose: deal.expectedCloseDate ? deal.expectedCloseDate.toISOString().split('T')[0] : '',
      wonAt: deal.wonAt ? deal.wonAt.toISOString().split('T')[0] : '',
      lostAt: deal.lostAt ? deal.lostAt.toISOString().split('T')[0] : '',
      createdAt: deal.createdAt.toISOString().split('T')[0],
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ─── Contact Exports ───

export async function exportContactsPdf(tenantId: string, filters: ContactFilters): Promise<Buffer> {
  const contacts = await fetchContacts(tenantId, filters);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Title
    doc.fontSize(20).font('Helvetica-Bold').text('Contact List Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#666666')
      .text(`Generated on ${new Date().toISOString().split('T')[0]} | Amass CRM`, { align: 'center' });
    doc.moveDown(1);

    // Summary
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000').text('Summary');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#333333');
    doc.text(`Total Contacts: ${contacts.length}`);
    const withEmail = contacts.filter((c) => c.email).length;
    const withPhone = contacts.filter((c) => c.phone).length;
    doc.text(`With Email: ${withEmail}`);
    doc.text(`With Phone: ${withPhone}`);
    doc.moveDown(1.5);

    // Contact table
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000').text('Contacts');
    doc.moveDown(0.5);

    const headers = ['Name', 'Email', 'Phone', 'Company', 'Job Title'];
    const colWidths = [110, 130, 90, 90, 80];

    doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000');
    let xPos = 50;
    const tableTop = doc.y;
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], xPos, tableTop, { width: colWidths[i] });
      xPos += colWidths[i];
    }
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(50 + colWidths.reduce((a, b) => a + b, 0), doc.y).stroke('#cccccc');
    doc.moveDown(0.3);

    doc.font('Helvetica').fontSize(8).fillColor('#333333');
    for (const contact of contacts.slice(0, 150)) {
      if (doc.y > 720) {
        doc.addPage();
      }
      const rowY = doc.y;
      xPos = 50;
      const fullName = `${contact.firstName} ${contact.lastName}`.trim() || '-';
      doc.text(fullName, xPos, rowY, { width: colWidths[0], ellipsis: true });
      doc.text(contact.email || '-', xPos + colWidths[0], rowY, { width: colWidths[1], ellipsis: true });
      doc.text(contact.phone || '-', xPos + colWidths[0] + colWidths[1], rowY, { width: colWidths[2] });
      doc.text(contact.company?.name || '-', xPos + colWidths[0] + colWidths[1] + colWidths[2], rowY, { width: colWidths[3], ellipsis: true });
      doc.text(contact.jobTitle || '-', xPos + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], rowY, { width: colWidths[4], ellipsis: true });
      doc.moveDown(0.5);
    }

    if (contacts.length > 150) {
      doc.moveDown(0.5);
      doc.fontSize(8).fillColor('#999999').text(`... and ${contacts.length - 150} more contacts`);
    }

    doc.end();
  });
}

export async function exportContactsExcel(tenantId: string, filters: ContactFilters): Promise<Buffer> {
  const contacts = await fetchContacts(tenantId, filters);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Amass CRM';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Contacts');
  sheet.columns = [
    { header: 'First Name', key: 'firstName', width: 18 },
    { header: 'Last Name', key: 'lastName', width: 18 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Phone', key: 'phone', width: 18 },
    { header: 'Mobile', key: 'mobile', width: 18 },
    { header: 'Job Title', key: 'jobTitle', width: 20 },
    { header: 'Company', key: 'company', width: 25 },
    { header: 'Source', key: 'source', width: 15 },
    { header: 'Score', key: 'score', width: 10 },
    { header: 'Assigned To', key: 'assignedTo', width: 20 },
    { header: 'Tags', key: 'tags', width: 25 },
    { header: 'Last Contacted', key: 'lastContacted', width: 15 },
    { header: 'Created At', key: 'createdAt', width: 15 },
  ];
  styleHeaderRow(sheet);

  for (const contact of contacts) {
    sheet.addRow({
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      mobile: contact.mobile,
      jobTitle: contact.jobTitle,
      company: contact.company?.name || '',
      source: contact.source,
      score: contact.score,
      assignedTo: contact.assignedTo?.name || '',
      tags: contact.tags.join(', '),
      lastContacted: contact.lastContactedAt ? contact.lastContactedAt.toISOString().split('T')[0] : '',
      createdAt: contact.createdAt.toISOString().split('T')[0],
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ─── Legacy generic exports (used by existing report controller) ───

export function generateExcel(report: ReportData): Buffer {
  // Keep backward compatibility - synchronous wrapper returning a simple XLSX buffer
  const rows = flattenReportData(report);
  if (rows.length === 0) {
    return createSimpleXlsxBuffer([['No data']]);
  }
  const headers = Object.keys(rows[0]);
  const data = [headers, ...rows.map((row) => headers.map((h) => String(row[h] ?? '')))];
  return createSimpleXlsxBuffer(data);
}

export function generatePdfHtml(report: ReportData, title: string): string {
  const rows = flattenReportData(report);

  let tableHtml = '';
  if (rows.length > 0) {
    const headers = Object.keys(rows[0]);
    const headerRow = headers
      .map((h) => `<th style="border:1px solid #ddd;padding:8px;background:#f5f5f5;text-align:left">${escapeHtml(h)}</th>`)
      .join('');
    const bodyRows = rows
      .map((row) => {
        const cells = headers
          .map((h) => `<td style="border:1px solid #ddd;padding:8px">${escapeHtml(String(row[h] ?? ''))}</td>`)
          .join('');
        return `<tr>${cells}</tr>`;
      })
      .join('\n');
    tableHtml = `<table style="border-collapse:collapse;width:100%;font-size:12px"><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  } else {
    tableHtml = '<p>No data available.</p>';
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { font-size: 24px; margin-bottom: 4px; }
    .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">Generated on ${new Date().toISOString().split('T')[0]} | Amass CRM</div>
  ${tableHtml}
</body>
</html>`;
}

// ─── Data Fetching ───

async function fetchDeals(tenantId: string, filters: DealFilters) {
  const where: Record<string, unknown> = { tenantId };

  if (filters.pipelineId) where.pipelineId = filters.pipelineId;
  if (filters.stageId) where.stageId = filters.stageId;
  if (filters.assignedToId) where.assignedToId = filters.assignedToId;
  if (filters.dateFrom || filters.dateTo) {
    const createdAt: Record<string, Date> = {};
    if (filters.dateFrom) createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) createdAt.lte = new Date(filters.dateTo);
    where.createdAt = createdAt;
  }

  return prisma.deal.findMany({
    where,
    include: {
      pipeline: { select: { name: true } },
      stage: { select: { name: true } },
      assignedTo: { select: { name: true } },
      company: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function fetchContacts(tenantId: string, filters: ContactFilters) {
  const where: Record<string, unknown> = { tenantId };

  if (filters.companyId) where.companyId = filters.companyId;
  if (filters.assignedToId) where.assignedToId = filters.assignedToId;
  if (filters.source) where.source = filters.source;
  if (filters.tag) where.tags = { has: filters.tag };
  if (filters.dateFrom || filters.dateTo) {
    const createdAt: Record<string, Date> = {};
    if (filters.dateFrom) createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) createdAt.lte = new Date(filters.dateTo);
    where.createdAt = createdAt;
  }

  return prisma.contact.findMany({
    where,
    include: {
      company: { select: { name: true } },
      assignedTo: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Helpers ───

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) + ' RON';
}

function styleHeaderRow(sheet: ExcelJS.Worksheet): void {
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.alignment = { vertical: 'middle' };
  headerRow.height = 24;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function flattenReportData(report: ReportData): Record<string, unknown>[] {
  const data = report.data;
  if (Array.isArray(data)) return data;
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      if (Array.isArray(obj[key]) && (obj[key] as unknown[]).length > 0 && typeof (obj[key] as unknown[])[0] === 'object') {
        return obj[key] as Record<string, unknown>[];
      }
    }
    return Object.entries(obj).map(([key, value]) => ({
      metric: key,
      value: typeof value === 'object' ? JSON.stringify(value) : value,
    }));
  }
  return [];
}

/**
 * Create a minimal valid XLSX file buffer (legacy - used for generic report export).
 */
function createSimpleXlsxBuffer(data: string[][]): Buffer {
  const escapeXml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

  const sheetRows = data
    .map((row, ri) => {
      const cells = row
        .map((val, ci) => {
          const colLetter = String.fromCharCode(65 + (ci % 26));
          const ref = `${colLetter}${ri + 1}`;
          const num = Number(val);
          if (val !== '' && !isNaN(num) && isFinite(num)) {
            return `<c r="${ref}"><v>${num}</v></c>`;
          }
          return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(val)}</t></is></c>`;
        })
        .join('');
      return `<row r="${ri + 1}">${cells}</row>`;
    })
    .join('\n');

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>${sheetRows}</sheetData>
</worksheet>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Report" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;

  const { deflateRawSync } = require('zlib');

  const files: { name: string; data: Buffer }[] = [
    { name: '[Content_Types].xml', data: Buffer.from(contentTypesXml) },
    { name: '_rels/.rels', data: Buffer.from(relsXml) },
    { name: 'xl/workbook.xml', data: Buffer.from(workbookXml) },
    { name: 'xl/_rels/workbook.xml.rels', data: Buffer.from(workbookRelsXml) },
    { name: 'xl/worksheets/sheet1.xml', data: Buffer.from(sheetXml) },
  ];

  return buildZip(files, deflateRawSync);
}

function buildZip(files: { name: string; data: Buffer }[], deflateRaw: (buf: Buffer) => Buffer): Buffer {
  const centralDir: Buffer[] = [];
  const localFiles: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBuffer = Buffer.from(file.name);
    const compressed = deflateRaw(file.data);
    const crc = crc32(file.data);

    const local = Buffer.alloc(30 + nameBuffer.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    local.writeUInt16LE(0, 28);
    nameBuffer.copy(local, 30);

    localFiles.push(local);
    localFiles.push(compressed);

    const central = Buffer.alloc(46 + nameBuffer.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(file.data.length, 24);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    nameBuffer.copy(central, 46);

    centralDir.push(central);
    offset += local.length + compressed.length;
  }

  const centralDirBuffer = Buffer.concat(centralDir);
  const centralDirOffset = offset;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralDirBuffer.length, 12);
  eocd.writeUInt32LE(centralDirOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localFiles, centralDirBuffer, eocd]);
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
