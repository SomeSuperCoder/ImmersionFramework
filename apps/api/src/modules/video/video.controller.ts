import { Controller, Post, Get, Body, Param, UsePipes } from '@nestjs/common';
import { VideoService } from './video.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CreateVideoRequestSchema } from '@immersion/shared';

@Controller('videos')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(CreateVideoRequestSchema))
  async create(@Body() body: { url: string; language?: string }) {
    const video = await this.videoService.getOrCreate(body.url, body.language);
    return { data: video };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const video = await this.videoService.findById(id);
    return { data: video };
  }
}