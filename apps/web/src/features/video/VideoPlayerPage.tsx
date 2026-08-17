import { useState } from 'react';
import { UrlInputForm } from './UrlInputForm';
import { SubtitleDisplay } from './SubtitleDisplay';
import { useVideoPlayer } from './hooks/useVideoPlayer';
import { useSubtitleSync } from './hooks/useSubtitleSync';
import type { SubtitleTrack } from '@immersion/shared';

export function VideoPlayerPage() {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<SubtitleTrack | null>(null);
  const { playerRef, player, ready } = useVideoPlayer(videoId);
  const { activeIndex } = useSubtitleSync(player, subtitles?.cues ?? []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b p-4">
        <h1 className="text-2xl font-bold">ImmersionFramework</h1>
        <p className="text-muted-foreground">Watch videos with real-time subtitles</p>
      </header>

      <main className="mx-auto max-w-6xl p-4">
        <UrlInputForm
          onVideoLoaded={(id, subs) => {
            setVideoId(id);
            setSubtitles(subs);
          }}
        />

        {videoId && (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
            {/* Video Player */}
            <div className="aspect-video rounded-lg border bg-muted">
              <div ref={playerRef} className="h-full w-full" />
            </div>

            {/* Subtitle Display */}
            <div className="rounded-lg border bg-card p-4">
              <h2 className="mb-3 text-lg font-semibold">Subtitles</h2>
              {subtitles ? (
                <SubtitleDisplay
                  cues={subtitles.cues}
                  activeIndex={activeIndex}
                />
              ) : (
                <p className="text-muted-foreground">No subtitles loaded</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
