// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Tab views for SalaryDex (§9): Kalkulator Benchmark · Negara · Peran & Senioritas · Skill.
import { clean, L, type DexViews } from './types.ts';

const LIMITS = L(
  'Sampel 16% lowongan; USD/tahun dengan kurs tetap (bukan PPP); statistik hanya bila n ≥ 30.',
  '16% sample of postings; USD/yr at fixed FX (not PPP); statistics only when n ≥ 30.',
);
const ROLES = [
  'software-eng',
  'data',
  'devops-cloud',
  'product',
  'design',
  'marketing',
  'sales',
  'finance',
  'hr',
  'operations',
  'customer-service',
  'healthcare',
  'education',
  'legal',
  'security',
  'it-support',
  'admin',
  'logistics',
  'manufacturing',
  'construction',
  'retail-hospitality',
  'science-research',
  'other',
];
const SEN = ['intern', 'entry', 'mid', 'senior', 'lead', 'manager', 'director', 'executive'];
const ANY = { value: '', label: L('Semua', 'All') };
const role = {
  kind: 'select' as const,
  key: 'role',
  label: L('Keluarga peran', 'Role family'),
  options: [ANY, ...ROLES.map((r) => ({ value: r, label: r }))],
  default: 'software-eng',
};
const country = (d: string) => ({
  kind: 'text' as const,
  key: 'country',
  label: L('Negara (ISO2 atau nama)', 'Country (ISO2 or name)'),
  default: d,
  placeholder: 'US, IN, ID…',
});

export const views: DexViews = {
  benchmark: {
    intro: LIMITS,
    controls: [
      role,
      country('US'),
      {
        kind: 'select',
        key: 'seniority',
        label: L('Senioritas', 'Seniority'),
        options: [ANY, ...SEN.map((s) => ({ value: s, label: s }))],
        default: '',
      },
      {
        kind: 'text',
        key: 'skill',
        label: L('Skill (opsional)', 'Skill (optional)'),
        default: '',
        placeholder: 'python, excel…',
      },
    ],
    calls: (v) => [
      {
        tool: 'salary_stats',
        input: {
          filters: clean({
            role_family: v.role,
            country: v.country?.trim(),
            seniority: v.seniority,
            skill: v.skill?.trim(),
          }),
          stat: 'median',
        },
      },
    ],
  },
  countries: {
    intro: L(
      'Median gaji per negara (USD, kurs tetap) — selisih antarnegara juga mencerminkan kurs, bukan daya beli.',
      'Median salary by country (USD, fixed FX) — gaps also reflect exchange rates, not purchasing power.',
    ),
    controls: [
      role,
      {
        kind: 'text',
        key: 'compare',
        label: L('Bandingkan (ISO2, pisah koma)', 'Compare (ISO2, comma-separated)'),
        default: 'US,IN,ID',
        placeholder: 'US,IN,ID',
      },
    ],
    calls: (v) => {
      const cs = (v.compare ?? '')
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 6);
      return [
        {
          tool: 'salary_distribution',
          input: clean({ group_by: 'country', filters: clean({ role_family: v.role }), limit: 20 }),
        },
        ...(cs.length >= 2
          ? [
              {
                tool: 'compare_salaries',
                input: { groups: cs.map((c) => ({ label: c, filters: clean({ country: c, role_family: v.role }) })) },
              },
            ]
          : []),
      ];
    },
  },
  roles: {
    intro: L(
      'Median gaji per keluarga peran dan per senioritas untuk negara yang dipilih (grup n < 30 disembunyikan).',
      'Median salary by role family and by seniority for the chosen country (groups with n < 30 hidden).',
    ),
    controls: [country('US')],
    calls: (v) => {
      const f = clean({ country: v.country?.trim() });
      return [
        { tool: 'salary_distribution', input: { group_by: 'role_family', filters: f, limit: 25 } },
        { tool: 'salary_distribution', input: { group_by: 'seniority', filters: f } },
      ];
    },
  },
  skills: {
    intro: L(
      'Skill hanya tercantum di ~17% lowongan; premi = median dengan skill vs tanpa skill, bukan efek kausal.',
      'Skills are listed in only ~17% of postings; premium = median with vs without the skill, not a causal effect.',
    ),
    controls: [{ kind: 'text', key: 'skill', label: L('Skill', 'Skill'), default: 'python' }, country('')],
    calls: (v) => [
      { tool: 'top_skills', input: clean({ country: v.country?.trim(), limit: 15 }) },
      { tool: 'skill_premium', input: clean({ skill: v.skill?.trim() || 'python', country: v.country?.trim() }) },
    ],
  },
};
