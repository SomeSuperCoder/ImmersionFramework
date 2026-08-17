import { Module } from '@nestjs/common';
import { SubtitleController } from './subtitle.controller';
import { SubtitleService } from './subtitle.service';
import { SubtitleRepository } from './subtitle.repository';
import { VttParser } from './parsers/vtt-parser';
import { VideoModule } from '../video/video.module';
import { YtdlpModule } from '../../common/ytdlp.module';

@Module({
  imports: [VideoModule, YtdlpModule],
  controllers: [SubtitleController],
  providers: [
    SubtitleService,
    SubtitleRepository,
    { provide: 'SubtitleParser', useClass: VttParser },
  ],
})
export class SubtitleModule {}
