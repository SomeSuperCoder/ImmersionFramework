import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { videos } from './video.schema';
import { db } from '../../common/database';

export interface CreateVideoData {
  youtubeId: string;
  title: string;
  channel: string;
  durationMs: number;
  thumbnailUrl: string;
  language?: string;
}

@Injectable()
export class VideoRepository {
  async findByYoutubeId(youtubeId: string) {
    const result = await db
      .select()
      .from(videos)
      .where(eq(videos.youtubeId, youtubeId))
      .limit(1);
    return result[0] ?? null;
  }

  async findById(id: string) {
    const result = await db
      .select()
      .from(videos)
      .where(eq(videos.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async create(data: CreateVideoData) {
    const now = new Date();
    const result = await db
      .insert(videos)
      .values({
        youtubeId: data.youtubeId,
        title: data.title,
        channel: data.channel,
        durationMs: data.durationMs,
        thumbnailUrl: data.thumbnailUrl,
        language: data.language ?? 'en',
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return result[0];
  }

  async upsert(youtubeId: string, data: CreateVideoData) {
    const existing = await this.findByYoutubeId(youtubeId);
    if (existing) {
      return existing;
    }
    return this.create(data);
  }
}