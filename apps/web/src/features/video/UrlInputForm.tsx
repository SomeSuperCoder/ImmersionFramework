import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateVideoRequestSchema } from '@immersion/shared';
import { apiClient } from '@/lib/api-client';
import type { SubtitleTrack } from '@immersion/shared';

interface VideoResponse {
  id: string;
  youtubeId: string;
  title: string;
  channel: string;
  durationMs: number;
  thumbnailUrl: string;
  language: string;
  createdAt: string;
}

interface UrlInputFormProps {
  onVideoLoaded: (videoId: string, subtitles: SubtitleTrack) => void;
}

export function UrlInputForm({ onVideoLoaded }: UrlInputFormProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = CreateVideoRequestSchema.safeParse({ url });
    if (!result.success) {
      setError(result.error.errors[0]?.message || 'Invalid URL');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Create/get video
      const videoRes = await apiClient.post<{ data: VideoResponse }>('/videos', result.data);
      const video = videoRes.data.data;

      // Step 2: Extract subtitles
      const subRes = await apiClient.post<{ data: SubtitleTrack | null }>(
        `/videos/${video.id}/subtitles/extract`,
        { language: result.data.language },
      );

      if (subRes.data.data) {
        onVideoLoaded(video.youtubeId, subRes.data.data);
      } else {
        setError('No subtitles available for this video');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Load a YouTube Video</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <Input
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1"
            disabled={loading}
          />
          <Button type="submit" disabled={loading}>
            {loading ? 'Loading...' : 'Load'}
          </Button>
        </form>
        {error && (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
