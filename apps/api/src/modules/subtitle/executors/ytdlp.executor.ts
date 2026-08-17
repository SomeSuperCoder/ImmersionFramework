import { Injectable } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { YtdlpExecutor, YtdlpMetadata } from './ytdlp.executor.interface';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { AppError, ErrorCategory } from '../../../common/errors/app-error';

const execFileAsync = promisify(execFile);
const YTDLP_PATH = process.env.YTDLP_PATH || 'yt-dlp';
const YTDLP_TIMEOUT = parseInt(process.env.YTDLP_TIMEOUT_MS || '30000', 10);

@Injectable()
export class YtdlpExecutorImpl implements YtdlpExecutor {
  async getMetadata(youtubeId: string): Promise<YtdlpMetadata> {
    const url = `https://www.youtube.com/watch?v=${youtubeId}`;
    try {
      const { stdout } = await execFileAsync(
        YTDLP_PATH,
        ['--dump-json', '--no-playlist', url],
        { timeout: YTDLP_TIMEOUT },
      );
      const data = JSON.parse(stdout);
      return {
        title: data.title,
        channel: data.channel || data.uploader || 'Unknown',
        durationMs: Math.round((data.duration || 0) * 1000),
        thumbnailUrl: data.thumbnail || `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
      };
    } catch (error) {
      throw new AppError(
        `Failed to fetch video metadata for ${youtubeId}`,
        ErrorCategory.EXTERNAL,
        502,
        'YTDLP_METADATA_ERROR',
        undefined,
        error,
      );
    }
  }

  async getSubtitles(youtubeId: string, language: string, outputDir: string): Promise<string> {
    const url = `https://www.youtube.com/watch?v=${youtubeId}`;
    const outputTemplate = path.join(outputDir, `${youtubeId}.%(ext)s`);
    try {
      await fs.mkdir(outputDir, { recursive: true });
      await execFileAsync(
        YTDLP_PATH,
        [
          '--skip-download',
          '--write-sub',
          '--write-auto-sub',
          '--sub-lang', language,
          '--sub-format', 'vtt',
          '--convert-subs', 'vtt',
          '-o', outputTemplate,
          '--no-playlist',
          url,
        ],
        { timeout: YTDLP_TIMEOUT },
      );
      // Find the generated .vtt file
      const files = await fs.readdir(outputDir);
      const vttFile = files.find(f => f.endsWith('.vtt'));
      if (!vttFile) {
        throw new Error('No subtitle file generated');
      }
      const filePath = path.join(outputDir, vttFile);
      const content = await fs.readFile(filePath, 'utf-8');
      // Clean up temp file
      await fs.unlink(filePath).catch(() => {});
      return content;
    } catch (error) {
      throw new AppError(
        `Failed to fetch subtitles for ${youtubeId}`,
        ErrorCategory.EXTERNAL,
        502,
        'YTDLP_SUBTITLE_ERROR',
        undefined,
        error,
      );
    }
  }
}