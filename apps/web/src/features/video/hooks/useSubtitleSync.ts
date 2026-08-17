import { useState, useEffect, useRef } from 'react';
import type { YouTubePlayer } from './useVideoPlayer';
import type { SubtitleCue } from '@immersion/shared';

export function useSubtitleSync(
  player: YouTubePlayer | null,
  cues: SubtitleCue[],
) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!player || cues.length === 0) {
      setActiveIndex(-1);
      return;
    }

    intervalRef.current = setInterval(() => {
      const currentTime = player.getCurrentTime();
      const index = cues.findIndex(
        (cue) => cue.start <= currentTime && cue.end > currentTime,
      );
      setActiveIndex(index);
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [player, cues]);

  return { activeIndex };
}
