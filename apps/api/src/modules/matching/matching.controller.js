import {
  Body,
  Controller,
  Dependencies,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { z } from 'zod';
import { decisionSchema, paginationQuerySchema } from '@humble/validation';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { applyParamDecorators } from '../../common/decorators/apply-params';
import { MatchingService } from './matching.service';

const matchIdParamSchema = z.object({ id: z.string().uuid() });

@Controller('v1/discovery')
@UseGuards(SessionAuthGuard)
@Dependencies(MatchingService)
export class DecisionsController {
  constructor(matchingService) {
    this.matchingService = matchingService;
  }

  @Post('decisions')
  @UsePipes(new ZodValidationPipe(decisionSchema))
  async submit(body, req) {
    return this.matchingService.submitDecision(req.currentUserId, body.targetId, body.decision);
  }
}

applyParamDecorators(DecisionsController, 'submit', [Body(), Req()]);

@Controller('v1/matches')
@UseGuards(SessionAuthGuard)
@Dependencies(MatchingService)
export class MatchesController {
  constructor(matchingService) {
    this.matchingService = matchingService;
  }

  @Get()
  @UsePipes(new ZodValidationPipe(paginationQuerySchema))
  async list(query, req) {
    return this.matchingService.listForUser(req.currentUserId, query);
  }

  @Get(':id')
  async getOne(params, req) {
    return this.matchingService.getOne(req.currentUserId, params.id);
  }

  @Post(':id/unmatch')
  async unmatch(params, req) {
    await this.matchingService.unmatch(req.currentUserId, params.id);
    return { message: 'Unmatched' };
  }
}

applyParamDecorators(MatchesController, 'list', [Query(), Req()]);
applyParamDecorators(MatchesController, 'getOne', [
  Param(new ZodValidationPipe(matchIdParamSchema)),
  Req(),
]);
applyParamDecorators(MatchesController, 'unmatch', [
  Param(new ZodValidationPipe(matchIdParamSchema)),
  Req(),
]);
