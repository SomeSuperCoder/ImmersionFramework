import { Injectable, Inject } from '@nestjs/common';
import { VideoRepository } from './video.repository';
import { YtdlpExecutor } from '../subtitle/executors/ytdlp.executor.interface';
import { AppError, ErrorCategory } from '../../common/errors/app-error';

@Injectable()
export class VideoService {
  constructor(
    private readonly videoRepository: VideoRepository,
    @Inject('YtdlpExecutor') private readonly ytdlpExecutor: YtdlpExecutor,
  ) {}

  async getOrCreate(url: string, language?: string) {
    const youtubeId = this.extractYoutubeId(url);
    if (!youtubeId) {
      throw new AppError(
        'Invalid YouTube URL',
        ErrorCategory.VALIDATION,
        400,
        'INVALID_YOUTUBE_URL',
      );
    }

    const existing = await this.videoRepository.findByYoutubeId(youtubeId);
    if (existing) {
      return existing;
    }

    // Fetch metadata from yt-dlp
    const metadata = await this.ytdlpExecutor.getMetadata(youtubeId);
    const video = await this.videoRepository.create({
      youtubeId,
      title: metadata.title,
      channel: metadata.channel,
      durationMs: metadata.durationMs,
      thumbnailUrl: metadata.thumbnailUrl,
      language: language ?? 'en',
    });
    return video;
  }

  async findById(id: string) {
    const video = await this.videoRepository.findById(id);
    if (!video) {
      throw new AppError(
        'Video not found',
        ErrorCategory.NOT_FOUND,
        404,
        'VIDEO_NOT_FOUND',
      );
    }
    return video;
  }

  extractYoutubeId(url: string): string | null {
    // Handle youtube.com/watch?v=...
    const watchPattern = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/;
    const match = url.match(watchPattern);
    return match ? match[1] : null;
  }
}