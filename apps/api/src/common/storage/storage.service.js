import { Injectable } from '@nestjs/common';
import fs from 'fs';
import path from 'path';
import { loadConfig } from '@humble/config';

const LOCAL_UPLOAD_DIR = path.join(process.cwd(), 'uploads');

/**
 * Storage abstraction (docs/05-hld.md §8). Production targets S3 via signed
 * URLs. When S3 credentials are not configured (local dev, per .env.example),
 * falls back to local disk under apps/api/uploads/ so the two-step
 * upload-url -> confirm flow (docs/06-lld.md §2) is exercisable without AWS.
 * Wiring the real S3 adapter is tracked in TASKS.md as a Slice-2 follow-up.
 */
@Injectable()
export class StorageService {
  constructor() {
    const { S3_BUCKET } = loadConfig();
    this.useS3 = Boolean(S3_BUCKET);
    if (!this.useS3) {
      fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
    }
  }

  /** @returns {{ key: string, uploadUrl: string }} */
  createUploadTarget(fileExtensionHint = 'bin') {
    const key = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExtensionHint}`;
    if (this.useS3) {
      throw new Error('S3 storage adapter not yet implemented — see TASKS.md Slice 2 follow-up');
    }
    return { key, uploadUrl: `/v1/uploads/${key}` };
  }

  localFilePath(key) {
    return path.join(LOCAL_UPLOAD_DIR, path.basename(key));
  }

  exists(key) {
    if (this.useS3) return true; // S3 existence assumed post-confirm in the real adapter
    return fs.existsSync(this.localFilePath(key));
  }

  readHeaderBytes(key, length = 12) {
    const fd = fs.openSync(this.localFilePath(key), 'r');
    const buffer = Buffer.alloc(length);
    fs.readSync(fd, buffer, 0, length, 0);
    fs.closeSync(fd);
    return buffer;
  }

  fileSize(key) {
    return fs.statSync(this.localFilePath(key)).size;
  }

  delete(key) {
    const filePath = this.localFilePath(key);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}
