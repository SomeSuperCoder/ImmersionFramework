import { Module } from '@nestjs/common';
import { VideoModule } from './modules/video/video.module';
import { SubtitleModule } from './modules/subtitle/subtitle.module';

@Module({
  imports: [
    VideoModule,
    SubtitleModule,
  ],
})
export class AppModule {}
