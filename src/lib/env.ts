import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  BRAVE_API_KEY: z.string().min(1, "BRAVE_API_KEY is required"),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),
  NEXTAUTH_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function env(): Env {
  if (_env) return _env;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    console.error(`[env] Missing or invalid environment variables:\n${missing}`);
    throw new Error(`Invalid environment configuration:\n${missing}`);
  }

  _env = parsed.data;
  return _env;
}
