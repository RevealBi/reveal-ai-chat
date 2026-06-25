import type { VerticalConfig } from './types';

// Each vertical maps to a Postgres table (server side: Reveal/Metadata/catalog.json +
// DataSourceProvider). Prompts are tuned to each table's real columns so the golden
// path always demos well — sales/profit/region, fuel/emissions, OEE/downtime, etc.

export const RETAIL: VerticalConfig = {
  id: 'retail',
  label: 'Retail / E-commerce',
  tagline: 'Sales, margin, and regional performance',
  datasourceId: 'retail',
  accent: '#7c3aed',
  prompts: [
    'What are the top 5 sub-categories by total sales?',
    'Show total profit by region',
    'Which cities generate the most profit?',
    'Trend monthly sales by category over time',
    'Rank product categories by total sales and average discount',
  ],
};

export const AUTOMOTIVE: VerticalConfig = {
  id: 'automotive',
  label: 'Automotive',
  tagline: 'Fuel economy & CO₂ across makes and models',
  datasourceId: 'automotive',
  accent: '#2563eb',
  prompts: [
    'Which vehicle classes have the highest average CO₂ emissions?',
    'Show average fuel consumption by make, ranked',
    'How does engine size relate to CO₂ emissions?',
    'Compare average fuel consumption across transmission types',
    'Trend average CO₂ emissions by model year',
  ],
};

export const MANUFACTURING: VerticalConfig = {
  id: 'manufacturing',
  label: 'Manufacturing',
  tagline: 'Line efficiency, OEE, downtime & quality',
  datasourceId: 'manufacturing',
  accent: '#ea580c',
  prompts: [
    'Which production lines have the highest reject rates?',
    'Show average OEE by shift',
    'Compare total downtime minutes across production lines',
    'What is the relationship between downtime and units produced?',
    'Rank product SKUs by total units produced',
  ],
};

export const HEALTHCARE: VerticalConfig = {
  id: 'healthcare',
  label: 'Healthcare',
  tagline: 'Admissions, conditions, billing & length of stay',
  datasourceId: 'healthcare',
  accent: '#0d9488',
  prompts: [
    'What is the average billing amount by medical condition?',
    'Show patient admissions by month',
    'Compare average length of stay across admission types',
    'Which insurance providers have the highest average billing amount?',
    'Break down patients by age group and gender',
  ],
};

export const ENERGY: VerticalConfig = {
  id: 'energy',
  label: 'Energy',
  tagline: 'Generation mix across states and counties',
  datasourceId: 'energy',
  accent: '#16a34a',
  prompts: [
    'Which states produce the most solar energy?',
    'Compare total wind versus solar generation by state',
    'Show total nuclear generation by state',
    'What are the top 10 counties by coal production?',
    'Rank states by total energy generation across all sources',
  ],
};

export const VERTICALS: VerticalConfig[] = [
  RETAIL,
  AUTOMOTIVE,
  MANUFACTURING,
  HEALTHCARE,
  ENERGY,
];
