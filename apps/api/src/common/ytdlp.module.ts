import { Module } from '@nestjs/common';
import { YtdlpExecutorImpl } from '../modules/subtitle/executors/ytdlp.executor';

@Module({
  providers: [
    {
      provide: 'YtdlpExecutor',
      useClass: YtdlpExecutorImpl,
    },
  ],
  exports: ['YtdlpExecutor'],
})
export class YtdlpModule {}