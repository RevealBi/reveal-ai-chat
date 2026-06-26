import type { VerticalConfig } from './types';

// Each vertical maps to its own Postgres database (server side: Reveal/Metadata/catalog.json
// + DataSourceProvider). Every database is a star schema with real foreign keys, a `dates`
// dimension, and city coordinates.
//
// These starter prompts were each tested end-to-end against the AI engine and only kept if the
// chart rendered with data. To stay reliable on the current engine they are single-fact-table
// aggregations (sum / count / average grouped by one of that table's own columns or by month).
// Deliberately avoided, because they render empty today: cross-table joins (e.g. "by product
// category", which needs order_items -> products -> categories), computed ratios (return rate,
// fraud rate, churn rate), and map visualizations. Keep new prompts to the same shape.

export const RETAIL: VerticalConfig = {
  id: 'retail',
  label: 'Retail / E-commerce',
  tagline: 'Sales, revenue, and regional performance',
  datasourceId: 'retail',
  accent: '#7c3aed',
  prompts: [
    'Show monthly sales revenue over the last two years',
    'What is the total revenue by quarter?',
    'How have orders trended by month?',
    'Compare revenue from Online versus In-Store channels',
    'What is the order status mix (Completed, Returned, Pending)?',
    'Show the number of customers by segment',
  ],
};

export const FINANCE: VerticalConfig = {
  id: 'finance',
  label: 'Finance / Banking',
  tagline: 'Transactions, balances, fraud & branches',
  datasourceId: 'finance',
  accent: '#ca8a04',
  prompts: [
    'Show monthly transaction volume over time',
    'How has total spending trended by month?',
    'Break down spending by merchant category',
    'Compare credits versus debits by month',
    'Show the mix of account statuses (Active, Dormant, Closed)',
    'Show average transaction amount by merchant category',
  ],
};

export const HEALTHCARE: VerticalConfig = {
  id: 'healthcare',
  label: 'Healthcare',
  tagline: 'Encounters, length of stay, cost & readmissions',
  datasourceId: 'healthcare',
  accent: '#0d9488',
  prompts: [
    'Show monthly patient encounters over the last two years',
    'Break down encounters by encounter type',
    'Show total billed charges by month',
    'Show total billed charges by encounter type',
    'How many patients have each primary condition?',
    'Show the patient gender breakdown',
  ],
};

export const AUTOMOTIVE: VerticalConfig = {
  id: 'automotive',
  label: 'Automotive',
  tagline: 'Dealer sales, vehicle mix & service quality',
  datasourceId: 'automotive',
  accent: '#2563eb',
  prompts: [
    'Show monthly vehicle sales over the last two years',
    'How has sales revenue trended by quarter?',
    'Show service revenue by month',
    'Break down service visits by service type (Maintenance, Repair, Recall, Warranty)',
    'Compare new versus used vehicle sales',
    'Show average CSI score by dealer tier',
  ],
};

export const MANUFACTURING: VerticalConfig = {
  id: 'manufacturing',
  label: 'Manufacturing',
  tagline: 'OEE, downtime, scrap & defects',
  datasourceId: 'manufacturing',
  accent: '#ea580c',
  prompts: [
    'Show average OEE by month',
    'How does OEE compare across shifts (Day, Swing, Night)?',
    'Show total units produced by month',
    'How has downtime trended by month?',
    'Show total scrap cost by month',
    'Show total defects by defect type',
  ],
};

export const ENERGY: VerticalConfig = {
  id: 'energy',
  label: 'Energy',
  tagline: 'Generation mix, capacity & demand',
  datasourceId: 'energy',
  accent: '#16a34a',
  prompts: [
    'Show monthly generation in megawatt-hours',
    'Break down electricity demand by sector (Residential, Commercial, Industrial)',
    'Compare demand by region',
    'What is total capacity by fuel type?',
    'Show total CO2 emissions by month',
    'Break down plants by region',
  ],
};

export const TELECOM: VerticalConfig = {
  id: 'telecom',
  label: 'Telecom',
  tagline: 'ARPU, churn & network performance',
  datasourceId: 'telecom',
  accent: '#0891b2',
  prompts: [
    'Show total data consumed by month',
    'Show total billing revenue by month',
    'Show total data traffic by month',
    'Show the subscriber status breakdown (Active, Suspended, Churned)',
    'Compare average ARPU by subscriber status',
    'Break down towers by technology',
  ],
};

export const VERTICALS: VerticalConfig[] = [
  RETAIL,
  FINANCE,
  HEALTHCARE,
  AUTOMOTIVE,
  MANUFACTURING,
  ENERGY,
  TELECOM,
];
