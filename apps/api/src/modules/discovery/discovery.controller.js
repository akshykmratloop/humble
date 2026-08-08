import { Controller, Dependencies, Get, Query, Req, UseGuards, UsePipes } from '@nestjs/common';
import { paginationQuerySchema } from '@humble/validation';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { applyParamDecorators } from '../../common/decorators/apply-params';
import { DiscoveryService } from './discovery.service';

@Controller('v1/discovery')
@UseGuards(SessionAuthGuard)
@Dependencies(DiscoveryService)
export class DiscoveryController {
  constructor(discoveryService) {
    this.discoveryService = discoveryService;
  }

  @Get('candidates')
  @UsePipes(new ZodValidationPipe(paginationQuerySchema))
  async getCandidates(query, req) {
    return this.discoveryService.getCandidates(req.currentUserId, query);
  }
}

applyParamDecorators(DiscoveryController, 'getCandidates', [Query(), Req()]);
