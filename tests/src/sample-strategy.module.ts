import { Module } from '@nestjs/common';
import { SampleStrategyService } from './sample-strategy.service';

@Module({
	providers: [SampleStrategyService],
	exports: [SampleStrategyService],
})
export class SampleStrategyModule {}
