import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().min(1).default('api'),

  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),

  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().min(1).default('15m'),
  JWT_REFRESH_TTL: z.string().min(1).default('7d'),

  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
});

export type Env = z.infer<typeof envSchema>;

export const validateEnv = (raw: Record<string, unknown>) => {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const lines = result.error.issues.map((issue) => {
      const field = issue.path.join('.') || '(root)';
      return `  ${field}: ${issue.message}`;
    });
    throw new Error(
      `Invalid environment configuration:\n${lines.join('\n')}\n\nSee .env.example`,
    );
  }

  return result.data;
};
