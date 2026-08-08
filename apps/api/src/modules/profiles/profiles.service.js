import { Injectable, Dependencies, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PRISMA } from '../../common/database/database.module';

const MIN_PHOTOS_FOR_COMPLETE = 1;

function computeAge(birthdate) {
  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const monthDiff = today.getMonth() - birthdate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
    age -= 1;
  }
  return age;
}

/** Explicit allow-list projection (docs/06-lld.md §2, INV-7) — never "the full entity minus a few fields". */
function toPublicView(profile) {
  return {
    id: profile.id,
    userId: profile.userId,
    name: profile.name,
    age: computeAge(profile.birthdate),
    bio: profile.bio,
    cityLabel: profile.cityLabel,
    photos: profile.photos
      .filter((p) => p.moderationStatus === 'APPROVED' || p.moderationStatus === 'PENDING')
      .sort((a, b) => a.order - b.order)
      .map((p) => ({ id: p.id, s3Key: p.s3Key, order: p.order })),
  };
}

/**
 * FR-02 Profile Management (docs/01-prd.md). Every mutating method scopes
 * its query to the caller's own userId — ownership is never taken from the
 * request body (docs/04-domain-model.md §5).
 */
@Injectable()
@Dependencies(PRISMA)
export class ProfilesService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async getOwn(userId) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: { photos: true },
    });
    if (!profile) throw new NotFoundException('Profile not yet created');
    return profile;
  }

  async createOrUpdateOwn(userId, data) {
    const existing = await this.prisma.profile.findUnique({ where: { userId } });

    const merged = {
      name: data.name ?? existing?.name,
      birthdate: data.birthdate ?? existing?.birthdate,
      gender: data.gender ?? existing?.gender,
      bio: data.bio !== undefined ? data.bio : existing?.bio,
      cityLabel: data.cityLabel !== undefined ? data.cityLabel : existing?.cityLabel,
    };

    if (!merged.name || !merged.birthdate || !merged.gender) {
      throw new ForbiddenException(
        'name, birthdate, and gender are required before a profile can be saved',
      );
    }

    const photoCount = existing
      ? await this.prisma.profilePhoto.count({ where: { profileId: existing.id } })
      : 0;
    const isComplete = Boolean(merged.name) && photoCount >= MIN_PHOTOS_FOR_COMPLETE;

    const profile = await this.prisma.profile.upsert({
      where: { userId },
      update: { ...merged, isComplete },
      create: { userId, ...merged, isComplete },
      include: { photos: true },
    });

    if (!existing) {
      await this.prisma.preference.upsert({
        where: { userId },
        update: {},
        create: { userId },
      });
    }

    return profile;
  }

  async getPublicView(targetUserId, requesterUserId) {
    const [blockedEitherDirection, profile] = await Promise.all([
      this.prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: requesterUserId, blockedId: targetUserId },
            { blockerId: targetUserId, blockedId: requesterUserId },
          ],
        },
      }),
      this.prisma.profile.findUnique({
        where: { userId: targetUserId },
        include: { photos: true },
      }),
    ]);

    if (blockedEitherDirection || !profile || !profile.isComplete) {
      throw new NotFoundException('Profile not found');
    }
    return toPublicView(profile);
  }
}

export { toPublicView, computeAge };
