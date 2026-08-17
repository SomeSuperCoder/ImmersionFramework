import { useEffect, useRef } from 'react';
import { SubtitleLine } from './SubtitleLine';
import type { SubtitleCue } from '@immersion/shared';

interface SubtitleDisplayProps {
  cues: SubtitleCue[];
  activeIndex: number;
}

export function SubtitleDisplay({ cues, activeIndex }: SubtitleDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active line
  useEffect(() => {
    if (activeIndex < 0 || !containerRef.current) return;
    const activeEl = containerRef.current.children[activeIndex] as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeIndex]);

  return (
    <div
      ref={containerRef}
      className="max-h-[600px] space-y-2 overflow-y-auto"
    >
      {cues.map((cue, index) => (
        <SubtitleLine
          key={`${cue.start}-${cue.end}`}
          cue={cue}
          isActive={index === activeIndex}
        />
      ))}
      {cues.length === 0 && (
        <p className="text-muted-foreground">No subtitle cues available</p>
      )}
    </div>
  );
}
