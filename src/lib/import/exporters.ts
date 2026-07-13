import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatBRL } from '@/lib/currency';

export interface ExportTx {
  date: string;
  type: 'income' | 'expense';
  amount: number;
  description?: string | null;
  category_name?: string | null;
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function normalizeRows(txs: ExportTx[]) {
  return txs.map(t => ({
    Data: t.date,
    Tipo: t.type === 'income' ? 'Receita' : 'Despesa',
    Categoria: t.category_name || '',
    Descrição: t.description || '',
    Valor: t.amount,
  }));
}

export function exportCSV(txs: ExportTx[], filename = 'finango-lancamentos.csv') {
  const csv = Papa.unparse(normalizeRows(txs));
  download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), filename);
}

export function exportXLSX(txs: ExportTx[], filename = 'finango-lancamentos.xlsx') {
  const ws = XLSX.utils.json_to_sheet(normalizeRows(txs));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Lançamentos');
  XLSX.writeFile(wb, filename);
}

export function exportPDF(txs: ExportTx[], filename = 'finango-relatorio.pdf') {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('Finango — Relatório de Lançamentos', 14, 16);
  doc.setFontSize(10);
  const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  doc.text(`Receitas: ${formatBRL(income)}   Despesas: ${formatBRL(expense)}   Saldo: ${formatBRL(income - expense)}`, 14, 24);
  autoTable(doc, {
    startY: 30,
    head: [['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor']],
    body: txs.map(t => [t.date, t.type === 'income' ? 'Receita' : 'Despesa', t.category_name || '', t.description || '', formatBRL(t.amount)]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [124, 58, 237] },
  });
  doc.save(filename);
}

export function exportJSON(data: unknown, filename = 'finango-backup.json') {
  download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), filename);
}
