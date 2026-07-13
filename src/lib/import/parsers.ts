// Parsers para OFX, CSV e XLSX. Retornam ParsedRow[] normalizado.
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParsedRow {
  date: string; // ISO YYYY-MM-DD
  description: string;
  amount: number; // positivo
  type: 'income' | 'expense';
  externalId?: string; // FITID (OFX) se houver
}

export interface ParseResult {
  rows: ParsedRow[];
  bank?: string;
  accountId?: string;
  balance?: number;
  currency?: string;
  period?: { start?: string; end?: string };
}

// ============ OFX ============
export function parseOFX(text: string): ParseResult {
  // Suporta OFX 1.x (SGML) e 2.x (XML). Extrai STMTTRN.
  const cleanText = text.replace(/\r/g, '');
  const bankMatch = cleanText.match(/<ORG>\s*([^\n<]+)/i);
  const accMatch = cleanText.match(/<ACCTID>\s*([^\n<]+)/i);
  const balMatch = cleanText.match(/<BALAMT>\s*([-\d.,]+)/i);
  const curMatch = cleanText.match(/<CURDEF>\s*([^\n<]+)/i);
  const startMatch = cleanText.match(/<DTSTART>\s*([\d]+)/i);
  const endMatch = cleanText.match(/<DTEND>\s*([\d]+)/i);

  const rows: ParsedRow[] = [];
  const trnRe = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let m: RegExpExecArray | null;
  while ((m = trnRe.exec(cleanText)) !== null) {
    const chunk = m[1];
    const dt = chunk.match(/<DTPOSTED>\s*([\d]+)/i)?.[1];
    const amt = chunk.match(/<TRNAMT>\s*([-\d.,]+)/i)?.[1];
    const memo = chunk.match(/<MEMO>\s*([^\n<]+)/i)?.[1];
    const name = chunk.match(/<NAME>\s*([^\n<]+)/i)?.[1];
    const fitid = chunk.match(/<FITID>\s*([^\n<]+)/i)?.[1];
    if (!dt || !amt) continue;
    const amtNum = parseFloat(amt.replace(/\./g, '').replace(',', '.').replace(/[^0-9.\-]/g, ''));
    if (!isFinite(amtNum) || amtNum === 0) continue;
    rows.push({
      date: parseOFXDate(dt),
      description: (memo || name || '').trim().replace(/\s+/g, ' '),
      amount: Math.abs(amtNum),
      type: amtNum < 0 ? 'expense' : 'income',
      externalId: fitid?.trim(),
    });
  }
  return {
    rows,
    bank: bankMatch?.[1]?.trim(),
    accountId: accMatch?.[1]?.trim(),
    balance: balMatch ? parseFloat(balMatch[1].replace(',', '.')) : undefined,
    currency: curMatch?.[1]?.trim(),
    period: {
      start: startMatch ? parseOFXDate(startMatch[1]) : undefined,
      end: endMatch ? parseOFXDate(endMatch[1]) : undefined,
    },
  };
}

function parseOFXDate(raw: string): string {
  // YYYYMMDD ou YYYYMMDDHHMMSS[.xxx][tz]
  const y = raw.slice(0, 4);
  const mo = raw.slice(4, 6);
  const d = raw.slice(6, 8);
  return `${y}-${mo}-${d}`;
}

// ============ CSV ============
export interface CsvMapping {
  date: string;
  description: string;
  amount: string;
  type?: string; // opcional (D/C, entrada/saida)
}

export function parseCSVRaw(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const res = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    delimiter: '', // autodetect
  });
  return { headers: (res.meta.fields || []) as string[], rows: (res.data as Record<string, string>[]) || [] };
}

export function guessCsvMapping(headers: string[]): CsvMapping | null {
  const lower = headers.map(h => normalize(h));
  const findIdx = (candidates: string[]) => lower.findIndex(h => candidates.some(c => h.includes(c)));
  const dateIdx = findIdx(['data', 'date', 'dt lanc']);
  const descIdx = findIdx(['descric', 'histor', 'memo', 'lancament', 'detalh', 'descript']);
  const amtIdx = findIdx(['valor', 'amount', 'vlr']);
  const typeIdx = findIdx(['tipo', 'type', 'debito credito', 'd c', 'operacao']);
  if (dateIdx < 0 || descIdx < 0 || amtIdx < 0) return null;
  return {
    date: headers[dateIdx],
    description: headers[descIdx],
    amount: headers[amtIdx],
    type: typeIdx >= 0 ? headers[typeIdx] : undefined,
  };
}

export function applyCsvMapping(rows: Record<string, string>[], mapping: CsvMapping): ParsedRow[] {
  const out: ParsedRow[] = [];
  for (const r of rows) {
    const rawDate = r[mapping.date];
    const rawDesc = r[mapping.description];
    const rawAmt = r[mapping.amount];
    if (!rawDate || rawAmt == null) continue;
    const iso = toIsoDate(rawDate);
    if (!iso) continue;
    const amtNum = parseAmount(rawAmt);
    if (!isFinite(amtNum) || amtNum === 0) continue;
    let type: 'income' | 'expense' = amtNum < 0 ? 'expense' : 'income';
    if (mapping.type) {
      const t = normalize(r[mapping.type] || '');
      if (/(^|\s)(d|debito|saida|out|expense)($|\s)/.test(t)) type = 'expense';
      if (/(^|\s)(c|credito|entrada|in|income)($|\s)/.test(t)) type = 'income';
    }
    out.push({
      date: iso,
      description: (rawDesc || '').trim().replace(/\s+/g, ' '),
      amount: Math.abs(amtNum),
      type,
    });
  }
  return out;
}

// ============ XLSX ============
export function parseXLSXRaw(buffer: ArrayBuffer): { headers: string[]; rows: Record<string, string>[] } {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
  if (!json.length) return { headers: [], rows: [] };
  const headers = Object.keys(json[0]);
  return { headers, rows: json.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v ?? '')]))) };
}

// ============ helpers ============
function normalize(s: string): string {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function parseAmount(raw: string): number {
  const s = String(raw).trim().replace(/[^\d,.\-]/g, '');
  if (!s) return NaN;
  // pt-BR: 1.234,56  -> remove pontos, troca vírgula por ponto
  // en-US: 1,234.56  -> remove vírgulas
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  let normalized = s;
  if (hasComma && hasDot) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      normalized = s.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = s.replace(/,/g, '');
    }
  } else if (hasComma) {
    normalized = s.replace(',', '.');
  }
  return parseFloat(normalized);
}

function toIsoDate(raw: string): string | null {
  const s = String(raw).trim();
  // DD/MM/YYYY ou DD-MM-YYYY
  let m = s.match(/^(\d{2})[\/\-.](\d{2})[\/\-.](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = (parseInt(y) > 50 ? '19' : '20') + y;
    return `${y}-${mo}-${d}`;
  }
  // YYYY-MM-DD
  m = s.match(/^(\d{4})[\/\-.](\d{2})[\/\-.](\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // Excel serial number
  const n = Number(s);
  if (isFinite(n) && n > 30000 && n < 90000) {
    const base = new Date(Date.UTC(1899, 11, 30));
    const dt = new Date(base.getTime() + n * 86400000);
    return dt.toISOString().slice(0, 10);
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

// ============ dedup hash ============
export async function makeExternalHash(userId: string, row: ParsedRow): Promise<string> {
  const key = `${userId}|${row.date}|${row.amount.toFixed(2)}|${row.description.toUpperCase().replace(/\s+/g, ' ').trim()}|${row.type}`;
  const buf = new TextEncoder().encode(key);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}
