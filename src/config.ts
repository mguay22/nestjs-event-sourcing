import z from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().default(3450),
  KURRENTDB_CONNECTION_STRING: z.string().default('kurrentdb://localhost:2113?tls=false'),
});

export const env = envSchema.parse(process.env);
