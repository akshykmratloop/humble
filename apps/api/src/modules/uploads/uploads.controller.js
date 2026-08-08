import {
  Controller,
  Put,
  Get,
  Param,
  Req,
  Res,
  BadRequestException,
  NotFoundException,
  UseGuards,
  Dependencies,
} from '@nestjs/common';
import fs from 'fs';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { StorageService } from '../../common/storage/storage.service';
import { detectImageType } from '../../common/utils/image-magic-bytes';
import { applyParamDecorators } from '../../common/decorators/apply-params';

const CONTENT_TYPE_BY_DETECTED_TYPE = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/**
 * Dev-only local-disk stand-in for the S3 signed-URL flow (docs/06-lld.md §2).
 * Only reachable when StorageService is not configured for S3 (see
 * apps/api/src/common/storage/storage.service.js). Never used in production —
 * the real S3 adapter (signed GET/PUT URLs served directly from S3/CloudFront)
 * replaces this whole controller once wired.
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

  @Get(':key')
  async getRaw(key, res) {
    if (this.storage.useS3 || !this.storage.exists(key)) {
      throw new NotFoundException('File not found');
    }
    const detectedType = detectImageType(this.storage.readHeaderBytes(key));
    res.setHeader(
      'Content-Type',
      CONTENT_TYPE_BY_DETECTED_TYPE[detectedType] || 'application/octet-stream',
    );
    res.setHeader('Cache-Control', 'private, max-age=3600');
    fs.createReadStream(this.storage.localFilePath(key)).pipe(res);
  }
}

applyParamDecorators(UploadsController, 'putRaw', [Param('key'), Req()]);
applyParamDecorators(UploadsController, 'getRaw', [Param('key'), Res()]);
