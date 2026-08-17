import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as videoSchema from '../modules/video/video.schema';
import * as subtitleSchema from '../modules/subtitle/subtitle.schema';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);

export const db = drizzle(client, { schema: { ...videoSchema, ...subtitleSchema } });