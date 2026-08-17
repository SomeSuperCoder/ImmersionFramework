import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VideoModule } from './modules/video/video.module';
import { SubtitleModule } from './modules/subtitle/subtitle.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    VideoModule,
    SubtitleModule,
  ],
})
export class AppModule {}
