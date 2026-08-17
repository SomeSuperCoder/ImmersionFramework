import { z } from 'zod';

export const CreateVideoRequestSchema = z.object({
  url: z.string().url('Invalid URL format').refine(
    (url) => {
      const pattern = /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/;
      return pattern.test(url);
    },
    { message: 'Must be a valid YouTube URL (youtube.com/watch?v=... or youtu.be/...)' },
  ),
  language: z.string().default('en'),
});

export type CreateVideoRequest = z.infer<typeof CreateVideoRequestSchema>;

export const VideoResponseSchema = z.object({
  data: z.object({
    id: z.string().uuid(),
    youtubeId: z.string(),
    title: z.string(),
    channel: z.string(),
    durationMs: z.number().int().positive(),
    thumbnailUrl: z.string().url(),
    language: z.string(),
    createdAt: z.string().datetime(),
  }),
});

export type VideoResponse = z.infer<typeof VideoResponseSchema>;
