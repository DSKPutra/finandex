// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Lighthouse CI (§14/§18): mobile Home ≥ 90 for Performance, Accessibility, Best Practices, SEO.
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npx vite preview --port 4174 --strictPort',
      startServerReadyPattern: 'Local',
      url: ['http://localhost:4174/'],
      numberOfRuns: 3,
      ...(process.env.CHROME_PATH ? { chromePath: process.env.CHROME_PATH } : {}),
      settings: { formFactor: 'mobile', chromeFlags: '--no-sandbox --headless=new', skipAudits: ['uses-http2'] },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci' },
  },
};
