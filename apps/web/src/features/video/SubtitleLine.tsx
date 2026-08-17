import { cn } from '@/lib/utils';
import type { SubtitleCue } from '@immersion/shared';

interface SubtitleLineProps {
  cue: SubtitleCue;
  isActive: boolean;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function SubtitleLine({ cue, isActive }: SubtitleLineProps) {
  return (
    <div
      className={cn(
        'rounded-md px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground',
      )}
    >
      <span className="mr-2 text-xs opacity-60">
        {formatTime(cue.start)}
      </span>
      {cue.text}
    </div>
  );
}
