// One-time bootstrap: pull the chosen sheet out of each large source workbook into a
// small, typed, single-sheet xlsx under db/source/ (committed so the sample is
// self-contained). gen-seed.mjs reads these, never the originals.
//
//   SOURCE_DIR="C:/path/to/workbooks" node extract-source.mjs   (defaults to ~/Downloads)

import XLSX from 'xlsx';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = process.env.SOURCE_DIR || join(homedir(), 'Downloads');
const OUT = join(__dirname, 'source');
mkdirSync(OUT, { recursive: true });

// Each vertical: which workbook + sheet holds its primary dataset (and optional row cap).
const MAP = [
  { table: 'automotive',    file: 'Automotive_Dashboards.xlsx',    sheet: 'FuelConsumption (1)' },
  { table: 'retail',        file: 'Retail_Dashboards.xlsx',        sheet: 'Supermart Grocery Sales - Retai' },
  { table: 'manufacturing', file: 'Manufacturing_Dashboards.xlsx', sheet: 'Production_Line' },
  { table: 'healthcare',    file: 'Healthcare_Dashboards.xlsx',    sheet: 'modified_healthcare_dataset', cap: 10000 },
  { table: 'energy',        file: 'Energy_Dashboards.xlsx',        sheet: 'Energy_Production' },
];

for (const m of MAP) {
  const wb = XLSX.readFile(join(SOURCE_DIR, m.file), { cellDates: true });
  const ws = wb.Sheets[m.sheet];
  if (!ws) { console.error(`  ! "${m.sheet}" not in ${m.file}; sheets: ${wb.SheetNames.join(', ')}`); continue; }

  let rows = XLSX.utils.sheet_to_json(ws, { defval: null, raw: true });
  const total = rows.length;
  if (m.cap && rows.length > m.cap) rows = rows.slice(0, m.cap);
  // trim stray header whitespace (e.g. "COEMISSIONS ")
  rows = rows.map((r) => { const o = {}; for (const k of Object.keys(r)) o[k.trim()] = r[k]; return o; });

  const outWs = XLSX.utils.json_to_sheet(rows, { cellDates: true });
  const outWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(outWb, outWs, m.table);
  XLSX.writeFile(outWb, join(OUT, `${m.table}.xlsx`));
  console.log(`${m.table.padEnd(14)} ${String(rows.length).padStart(6)}/${total} rows  -> source/${m.table}.xlsx`);
}
console.log('\nDone. Curated source written to db/source/.');
