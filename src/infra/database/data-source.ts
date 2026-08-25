import 'dotenv/config';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { baseOptions } from './typeorm.options';

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env first.');
}

export default new DataSource({
  ...baseOptions(url),
  entities: [join(__dirname, '..', '..', '**', '*.entity.{ts,js}')],
});
