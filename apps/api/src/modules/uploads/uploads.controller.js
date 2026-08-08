import {
  Controller,
  Put,
  Param,
  Req,
  BadRequestException,
  UseGuards,
  Dependencies,
} from '@nestjs/common';
import fs from 'fs';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { StorageService } from '../../common/storage/storage.service';
import { applyParamDecorators } from '../../common/decorators/apply-params';

/**
 * Dev-only local-disk stand-in for the S3 signed-URL flow (docs/06-lld.md §2).
 * Only reachable when StorageService is not configured for S3 (see
 * apps/api/src/common/storage/storage.service.js). Never used in production —
 * the real S3 adapter replaces this endpoint entirely once wired.
 */
@Controller('v1/uploads')
@UseGuards(SessionAuthGuard)
@Dependencies(StorageService)
export class UploadsController {
  constructor(storage) {
    this.storage = storage;
  }

  @Put(':key')
  async putRaw(key, req) {
    if (this.storage.useS3) {
      throw new BadRequestException('Local upload endpoint disabled — S3 is configured');
    }
    if (!Buffer.isBuffer(req.body)) {
      throw new BadRequestException('Expected a raw binary request body');
    }
    fs.writeFileSync(this.storage.localFilePath(key), req.body);
    return { key, size: req.body.length };
  }
}

applyParamDecorators(UploadsController, 'putRaw', [Param('key'), Req()]);
