import { join } from 'node:path';
import type { DataSourceOptions } from 'typeorm';

export const baseOptions = (url: string): DataSourceOptions => ({
  type: 'postgres',
  url,
  uuidExtension: 'pgcrypto',
  synchronize: false,
  migrationsRun: false,
  migrations: [join(__dirname, '..', '..', 'migrations', '*.{ts,js}')],
  migrationsTableName: 'migrations',
});
