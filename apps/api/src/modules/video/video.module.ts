import { Module } from '@nestjs/common';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { VideoRepository } from './video.repository';
import { YtdlpModule } from '../../common/ytdlp.module';

@Module({
  imports: [YtdlpModule],
  controllers: [VideoController],
  providers: [VideoService, VideoRepository],
  exports: [VideoService],
})
export class VideoModule {}
