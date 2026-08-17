import { Controller, Post, Get, Param, Query, Body, UsePipes } from '@nestjs/common';
import { SubtitleService } from './subtitle.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { SubtitleQuerySchema } from '@immersion/shared';

@Controller('videos/:videoId/subtitles')
export class SubtitleController {
  constructor(private readonly subtitleService: SubtitleService) {}

  @Post('extract')
  async extract(
    @Param('videoId') videoId: string,
    @Body() body: { language?: string },
  ) {
    const track = await this.subtitleService.extractForVideo(videoId, body.language);
    return { data: track };
  }

  @Get()
  @UsePipes(new ZodValidationPipe(SubtitleQuerySchema))
  async findOne(
    @Param('videoId') videoId: string,
    @Query() query: { language?: string },
  ) {
    const track = await this.subtitleService.findByVideoId(videoId, query.language);
    return { data: track };
  }
}