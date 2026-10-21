// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Server environment (§19). Read once per cold start; secrets never leave the server.
import { z } from 'zod';

const bool = (d: boolean) =>
  z
    .enum(['1', '0', 'true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? d : v === '1' || v === 'true'));
const int = (d: number) => z.coerce.number().int().positive().optional().default(d);

const EnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_MODEL: z.string().min(1).optional().default('claude-sonnet-5-5'),
  ANTHROPIC_MODEL_FAST: z.string().min(1).optional().default('claude-haiku-5-5'),
  /** server-side refusal fallback (`fallbacks: "default"`, beta header); on by default */
  ANTHROPIC_SERVER_FALLBACK: bool(true),
  CHAT_EFFORT: z.enum(['low', 'medium', 'high']).optional().default('low'),
  CHAT_MAX_TOKENS: int(2048),
  CHAT_DEADLINE_MS: int(50_000),
  TOOL_TIMEOUT_MS: int(8_000),
  DATA_BASE_URL: z.string().url().optional(),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  PRODUCTION_ORIGIN: z.string().optional(),
  DAILY_TOKEN_BUDGET: int(5_000_000),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'silent']).optional().default('info'),
  APP_BUILD_ID: z.string().optional(),
});
export type Env = z.infer<typeof EnvSchema>;

export function readEnv(
  src: Record<string, string | undefined> = (globalThis as { process?: { env: Record<string, string | undefined> } })
    .process?.env ?? {},
): Env {
  const clean = Object.fromEntries(Object.entries(src).filter(([, v]) => v !== undefined && v !== ''));
  return EnvSchema.parse(clean);
}

export const DEFAULT_ORIGINS = [
  'https://finandex.vercel.app',
  'https://finandex.netlify.app',
  'capacitor://localhost',
  'https://localhost',
  'http://localhost:5173',
  'http://localhost:4173',
  'https://*.lovable.app',
  'https://*.lovableproject.com',
];
