import { useEffect, useRef, useState, useCallback } from 'react';

// YouTube IFrame API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export interface YouTubePlayer {
  getCurrentTime: () => number;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
}

export function useVideoPlayer(videoId: string | null) {
  const playerRef = useRef<HTMLDivElement>(null);
  const [player, setPlayer] = useState<YouTubePlayer | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!videoId || !playerRef.current) return;

    // Load YouTube IFrame API
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      const ytPlayer = new window.YT.Player(playerRef.current!, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: () => {
            setPlayer({
              getCurrentTime: () => ytPlayer.getCurrentTime(),
              playVideo: () => ytPlayer.playVideo(),
              pauseVideo: () => ytPlayer.pauseVideo(),
              seekTo: (s, a) => ytPlayer.seekTo(s, a),
            });
            setReady(true);
          },
        },
      });
    };

    return () => {
      setPlayer(null);
      setReady(false);
    };
  }, [videoId]);

  return { playerRef, player, ready };
}
