export interface YtdlpMetadata {
  title: string;
  channel: string;
  durationMs: number;
  thumbnailUrl: string;
}

export interface YtdlpExecutor {
  getMetadata(youtubeId: string): Promise<YtdlpMetadata>;
  getSubtitles(youtubeId: string, language: string, outputDir: string): Promise<string>;
}
