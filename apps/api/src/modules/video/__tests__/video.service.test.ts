import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VideoService } from '../video.service';
import { VideoRepository, CreateVideoData } from '../video.repository';
import { YtdlpExecutor, YtdlpMetadata } from '../../subtitle/executors/ytdlp.executor.interface';
import { AppError, ErrorCategory } from '../../../common/errors/app-error';

describe('VideoService', () => {
  let videoService: VideoService;
  let mockVideoRepository: {
    findByYoutubeId: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  let mockYtdlpExecutor: {
    getMetadata: ReturnType<typeof vi.fn>;
    getSubtitles: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockVideoRepository = {
      findByYoutubeId: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
    };
    mockYtdlpExecutor = {
      getMetadata: vi.fn(),
      getSubtitles: vi.fn(),
    };
    videoService = new VideoService(
      mockVideoRepository as unknown as VideoRepository,
      mockYtdlpExecutor as unknown as YtdlpExecutor,
    );
  });

  describe('getOrCreate', () => {
    it('should return cached video when youtubeId exists', async () => {
      const existingVideo = {
        id: 'video-1',
        youtubeId: 'dQw4w9WgXcQ',
        title: 'Test Video',
        channel: 'Test Channel',
        durationMs: 180000,
        thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        language: 'en',
      };
      mockVideoRepository.findByYoutubeId.mockResolvedValue(existingVideo);

      const result = await videoService.getOrCreate('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

      expect(result).toEqual(existingVideo);
      expect(mockVideoRepository.findByYoutubeId).toHaveBeenCalledWith('dQw4w9WgXcQ');
      expect(mockYtdlpExecutor.getMetadata).not.toHaveBeenCalled();
      expect(mockVideoRepository.create).not.toHaveBeenCalled();
    });

    it('should fetch metadata and create video on cache miss', async () => {
      const metadata: YtdlpMetadata = {
        title: 'New Video',
        channel: 'New Channel',
        durationMs: 120000,
        thumbnailUrl: 'https://img.youtube.com/vi/new123/hqdefault.jpg',
      };
      const createdVideo = {
        id: 'video-2',
        youtubeId: 'new123',
        ...metadata,
        language: 'en',
      };

      mockVideoRepository.findByYoutubeId.mockResolvedValue(null);
      mockYtdlpExecutor.getMetadata.mockResolvedValue(metadata);
      mockVideoRepository.create.mockResolvedValue(createdVideo);

      const result = await videoService.getOrCreate('https://www.youtube.com/watch?v=new123');

      expect(mockVideoRepository.findByYoutubeId).toHaveBeenCalledWith('new123');
      expect(mockYtdlpExecutor.getMetadata).toHaveBeenCalledWith('new123');
      expect(mockVideoRepository.create).toHaveBeenCalledWith({
        youtubeId: 'new123',
        title: 'New Video',
        channel: 'New Channel',
        durationMs: 120000,
        thumbnailUrl: 'https://img.youtube.com/vi/new123/hqdefault.jpg',
        language: 'en',
      });
      expect(result).toEqual(createdVideo);
    });

    it('should throw VALIDATION error for invalid YouTube URL', async () => {
      await expect(
        videoService.getOrCreate('https://not-a-youtube-url.com/video')
      ).rejects.toThrow(AppError);

      try {
        await videoService.getOrCreate('https://not-a-youtube-url.com/video');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).category).toBe(ErrorCategory.VALIDATION);
        expect((error as AppError).statusCode).toBe(400);
        expect((error as AppError).code).toBe('INVALID_YOUTUBE_URL');
      }
    });

    it('should extract youtubeId from youtube.com/watch?v=... URL', async () => {
      const metadata: YtdlpMetadata = {
        title: 'Test',
        channel: 'Test',
        durationMs: 1000,
        thumbnailUrl: 'https://img.youtube.com/vi/abc-123/hqdefault.jpg',
      };
      mockVideoRepository.findByYoutubeId.mockResolvedValue(null);
      mockYtdlpExecutor.getMetadata.mockResolvedValue(metadata);
      mockVideoRepository.create.mockResolvedValue({ id: '1', youtubeId: 'abc-123' });

      await videoService.getOrCreate('https://www.youtube.com/watch?v=abc-123');

      expect(mockVideoRepository.findByYoutubeId).toHaveBeenCalledWith('abc-123');
    });

    it('should extract youtubeId from youtu.be/... URL', async () => {
      const metadata: YtdlpMetadata = {
        title: 'Test',
        channel: 'Test',
        durationMs: 1000,
        thumbnailUrl: 'https://img.youtube.com/vi/xyz-789/hqdefault.jpg',
      };
      mockVideoRepository.findByYoutubeId.mockResolvedValue(null);
      mockYtdlpExecutor.getMetadata.mockResolvedValue(metadata);
      mockVideoRepository.create.mockResolvedValue({ id: '2', youtubeId: 'xyz-789' });

      await videoService.getOrCreate('https://youtu.be/xyz-789');

      expect(mockVideoRepository.findByYoutubeId).toHaveBeenCalledWith('xyz-789');
    });

    it('should use default language en when not provided', async () => {
      const metadata: YtdlpMetadata = {
        title: 'Test',
        channel: 'Test',
        durationMs: 1000,
        thumbnailUrl: 'https://img.youtube.com/vi/test123/hqdefault.jpg',
      };
      mockVideoRepository.findByYoutubeId.mockResolvedValue(null);
      mockYtdlpExecutor.getMetadata.mockResolvedValue(metadata);
      mockVideoRepository.create.mockResolvedValue({ id: '3', youtubeId: 'test123', language: 'en' });

      await videoService.getOrCreate('https://www.youtube.com/watch?v=test123');

      expect(mockVideoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ language: 'en' })
      );
    });

    it('should use provided language when specified', async () => {
      const metadata: YtdlpMetadata = {
        title: 'Test',
        channel: 'Test',
        durationMs: 1000,
        thumbnailUrl: 'https://img.youtube.com/vi/test456/hqdefault.jpg',
      };
      mockVideoRepository.findByYoutubeId.mockResolvedValue(null);
      mockYtdlpExecutor.getMetadata.mockResolvedValue(metadata);
      mockVideoRepository.create.mockResolvedValue({ id: '4', youtubeId: 'test456', language: 'es' });

      await videoService.getOrCreate('https://www.youtube.com/watch?v=test456', 'es');

      expect(mockVideoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ language: 'es' })
      );
    });
  });

  describe('findById', () => {
    it('should return video when found', async () => {
      const video = {
        id: 'video-1',
        youtubeId: 'dQw4w9WgXcQ',
        title: 'Test Video',
        channel: 'Test Channel',
        durationMs: 180000,
        thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        language: 'en',
      };
      mockVideoRepository.findById.mockResolvedValue(video);

      const result = await videoService.findById('video-1');

      expect(result).toEqual(video);
      expect(mockVideoRepository.findById).toHaveBeenCalledWith('video-1');
    });

    it('should throw NOT_FOUND when video does not exist', async () => {
      mockVideoRepository.findById.mockResolvedValue(null);

      await expect(videoService.findById('nonexistent')).rejects.toThrow(AppError);

      try {
        await videoService.findById('nonexistent');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).category).toBe(ErrorCategory.NOT_FOUND);
        expect((error as AppError).statusCode).toBe(404);
        expect((error as AppError).code).toBe('VIDEO_NOT_FOUND');
      }
    });
  });

  describe('extractYoutubeId', () => {
    it('should extract youtubeId from youtube.com/watch?v=... URL', () => {
      const id = videoService.extractYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(id).toBe('dQw4w9WgXcQ');
    });

    it('should extract youtubeId from youtu.be/... URL', () => {
      const id = videoService.extractYoutubeId('https://youtu.be/dQw4w9WgXcQ');
      expect(id).toBe('dQw4w9WgXcQ');
    });

    it('should extract youtubeId from URL with extra params', () => {
      const id = videoService.extractYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123');
      expect(id).toBe('dQw4w9WgXcQ');
    });

    it('should return null for non-YouTube URLs', () => {
      expect(videoService.extractYoutubeId('https://vimeo.com/123456')).toBeNull();
      expect(videoService.extractYoutubeId('https://example.com')).toBeNull();
      expect(videoService.extractYoutubeId('not-a-url')).toBeNull();
      expect(videoService.extractYoutubeId('')).toBeNull();
    });

    it('should handle youtube.com with www prefix', () => {
      const id = videoService.extractYoutubeId('https://www.youtube.com/watch?v=abc123');
      expect(id).toBe('abc123');
    });

    it('should handle youtube.com without www prefix', () => {
      const id = videoService.extractYoutubeId('https://youtube.com/watch?v=abc123');
      expect(id).toBe('abc123');
    });

    it('should handle youtube IDs with hyphens and underscores', () => {
      const id = videoService.extractYoutubeId('https://www.youtube.com/watch?v=abc-123_def');
      expect(id).toBe('abc-123_def');
    });
  });
});
