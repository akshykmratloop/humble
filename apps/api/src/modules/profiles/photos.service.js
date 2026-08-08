import {
  Injectable,
  Dependencies,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PRISMA } from '../../common/database/database.module';
import { StorageService } from '../../common/storage/storage.service';
import { detectImageType } from '../../common/utils/image-magic-bytes';

const MAX_PHOTOS = 6;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** FR-02 photo upload flow (docs/06-lld.md §2): two-step signed-URL pattern. */
@Injectable()
@Dependencies(PRISMA, StorageService)
export class PhotosService {
  constructor(prisma, storage) {
    this.prisma = prisma;
    this.storage = storage;
  }

  async requestUploadUrl(userId) {
    const profile = await this._getOrCreateBareProfile(userId);
    const existingCount = await this.prisma.profilePhoto.count({
      where: { profileId: profile.id },
    });
    if (existingCount >= MAX_PHOTOS) {
      throw new BadRequestException(`A profile may have at most ${MAX_PHOTOS} photos`);
    }

    const { key, uploadUrl } = this.storage.createUploadTarget('bin');
    const photo = await this.prisma.profilePhoto.create({
      data: {
        profileId: profile.id,
        s3Key: key,
        order: existingCount,
        moderationStatus: 'PENDING',
      },
    });
    return { photoId: photo.id, uploadUrl };
  }

  async confirmUpload(userId, photoId) {
    const photo = await this._loadOwnedPhoto(userId, photoId);

    if (!this.storage.exists(photo.s3Key)) {
      throw new BadRequestException('No uploaded file found for this photo — upload it first');
    }
    if (this.storage.fileSize(photo.s3Key) > MAX_FILE_SIZE_BYTES) {
      this.storage.delete(photo.s3Key);
      await this.prisma.profilePhoto.delete({ where: { id: photoId } });
      throw new BadRequestException('File exceeds the 10MB limit');
    }
    const detectedType = detectImageType(this.storage.readHeaderBytes(photo.s3Key));
    if (!detectedType) {
      this.storage.delete(photo.s3Key);
      await this.prisma.profilePhoto.delete({ where: { id: photoId } });
      throw new BadRequestException('File is not a valid jpg/png/webp image');
    }

    // MVP: async moderation scan is a documented post-MVP integration (docs/01-prd.md FR-02);
    // photos are provisionally APPROVED after passing the structural checks above.
    await this.prisma.profilePhoto.update({
      where: { id: photoId },
      data: { moderationStatus: 'APPROVED' },
    });
    await this._recomputeCompleteness(photo.profileId);
    return { photoId, moderationStatus: 'APPROVED' };
  }

  async reorder(userId, orderedPhotoIds) {
    const profile = await this._getOwnedProfileOrThrow(userId);
    const owned = await this.prisma.profilePhoto.findMany({ where: { profileId: profile.id } });
    const ownedIds = new Set(owned.map((p) => p.id));
    if (
      orderedPhotoIds.length !== owned.length ||
      !orderedPhotoIds.every((id) => ownedIds.has(id))
    ) {
      throw new BadRequestException(
        "orderedPhotoIds must contain exactly this profile's photo ids",
      );
    }
    await this.prisma.$transaction(
      orderedPhotoIds.map((id, index) =>
        this.prisma.profilePhoto.update({ where: { id }, data: { order: index } }),
      ),
    );
  }

  async remove(userId, photoId) {
    const photo = await this._loadOwnedPhoto(userId, photoId);
    this.storage.delete(photo.s3Key);
    await this.prisma.profilePhoto.delete({ where: { id: photoId } });
    await this._recomputeCompleteness(photo.profileId);
  }

  async _getOrCreateBareProfile(userId) {
    const existing = await this.prisma.profile.findUnique({ where: { userId } });
    if (existing) return existing;
    throw new ForbiddenException(
      'Create your profile (name/birthdate/gender) before uploading photos',
    );
  }

  async _getOwnedProfileOrThrow(userId) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }

  async _loadOwnedPhoto(userId, photoId) {
    const profile = await this._getOwnedProfileOrThrow(userId);
    const photo = await this.prisma.profilePhoto.findUnique({ where: { id: photoId } });
    if (!photo || photo.profileId !== profile.id) {
      throw new NotFoundException('Photo not found');
    }
    return photo;
  }

  async _recomputeCompleteness(profileId) {
    const [profile, approvedCount] = await Promise.all([
      this.prisma.profile.findUnique({ where: { id: profileId } }),
      this.prisma.profilePhoto.count({ where: { profileId, moderationStatus: 'APPROVED' } }),
    ]);
    const isComplete =
      Boolean(profile.name && profile.birthdate && profile.gender) && approvedCount >= 1;
    if (isComplete !== profile.isComplete) {
      await this.prisma.profile.update({ where: { id: profileId }, data: { isComplete } });
    }
  }
}
