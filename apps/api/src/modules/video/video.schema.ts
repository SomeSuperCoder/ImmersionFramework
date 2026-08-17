import { pgTable, text, timestamp, integer, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const videos = pgTable('videos', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  youtubeId: text('youtube_id').notNull(),
  title: text('title').notNull(),
  channel: text('channel').notNull(),
  durationMs: integer('duration_ms').notNull(),
  thumbnailUrl: text('thumbnail_url').notNull(),
  language: text('language').default('en'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('idx_videos_youtube_id').on(table.youtubeId),
]);
