import { apiClient } from '@/lib/api-client';
import type { CreateVideoRequest, SubtitleTrack } from '@immersion/shared';

export async function createVideo(data: CreateVideoRequest) {
  const response = await apiClient.post('/videos', data);
  return response.data;
}

export async function extractSubtitles(videoId: string, language: string = 'en') {
  const response = await apiClient.post(`/videos/${videoId}/subtitles/extract`, { language });
  return response.data as SubtitleTrack;
}

export async function getSubtitles(videoId: string, language?: string) {
  const params = language ? `?language=${language}` : '';
  const response = await apiClient.get(`/videos/${videoId}/subtitles${params}`);
  return response.data;
}
