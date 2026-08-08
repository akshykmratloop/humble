import { Module } from '@nestjs/common';
import { DecisionsController, MatchesController } from './matching.controller';
import { MatchingService } from './matching.service';
import { DiscoveryModule } from '../discovery/discovery.module';

@Module({
  imports: [DiscoveryModule],
  controllers: [DecisionsController, MatchesController],
  providers: [MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}
