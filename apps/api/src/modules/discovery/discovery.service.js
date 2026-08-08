import { Injectable, Dependencies, NotFoundException } from '@nestjs/common';
import { PRISMA } from '../../common/database/database.module';
import { toPublicView } from '../profiles/profiles.service';

const GENDER_VALUES = ['MAN', 'WOMAN', 'NONBINARY', 'OTHER'];

/** Empty preference = open to anyone (docs/06-lld.md §3). Deliberately checked in
 * application code rather than a Prisma `isEmpty`/`hasSome` filter on the nested
 * relation — both were found to silently fail to match empty enum-array columns
 * against this Prisma/driver version (verified directly against Postgres; not a
 * logic bug, a query-builder limitation). Revisit if a future Prisma upgrade
 * fixes it and this can move back into the SQL WHERE clause for efficiency. */
function candidatePreferenceAllowsSelf(candidatePreference, selfGender) {
  if (!candidatePreference) return true;
  const prefs = candidatePreference.genderPreference;
  return prefs.length === 0 || prefs.includes('ANY') || prefs.includes(selfGender);
}

function birthdateRangeForAges(ageMin, ageMax) {
  const today = new Date();
  const oldestAllowedBirthdate = new Date(
    today.getFullYear() - ageMax,
    today.getMonth(),
    today.getDate(),
  );
  const youngestAllowedBirthdate = new Date(
    today.getFullYear() - ageMin,
    today.getMonth(),
    today.getDate() + 1, // inclusive of someone who turns ageMin today
  );
  return { gte: oldestAllowedBirthdate, lte: youngestAllowedBirthdate };
}

/**
 * FR-03 Discovery (docs/01-prd.md, docs/06-lld.md §3). Every exclusion here
 * is server-side and non-negotiable — a blocked or already-decided profile
 * must never reappear, regardless of what the client requests.
 */
@Injectable()
@Dependencies(PRISMA)
export class DiscoveryService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  /** Server-side re-validation that `targetId` is currently a legitimate candidate
   * for `selfId` — used both by candidate listing and, critically, re-run before
   * accepting a decision so a crafted request can't target an excluded profile
   * (docs/06-lld.md §4). */
  async isEligibleCandidate(selfId, targetId) {
    if (selfId === targetId) return false;

    const [blocked, targetProfile, selfProfile] = await Promise.all([
      this.prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: selfId, blockedId: targetId },
            { blockerId: targetId, blockedId: selfId },
          ],
        },
      }),
      this.prisma.profile.findUnique({
        where: { userId: targetId },
        include: { user: true },
      }),
      this.prisma.profile.findUnique({ where: { userId: selfId } }),
    ]);

    if (blocked || !targetProfile || !selfProfile) return false;
    if (!targetProfile.isComplete) return false;
    if (targetProfile.user.status !== 'ACTIVE') return false;
    return true;
  }

  async getCandidates(selfId, { cursor, limit }) {
    const selfProfile = await this.prisma.profile.findUnique({ where: { userId: selfId } });
    if (!selfProfile) {
      throw new NotFoundException('Complete your profile before browsing discovery');
    }
    const selfPreference = await this.prisma.preference.upsert({
      where: { userId: selfId },
      update: {},
      create: { userId: selfId },
    });

    const [decided, blockedEitherDirection] = await Promise.all([
      this.prisma.discoveryDecision.findMany({
        where: { deciderId: selfId },
        select: { targetId: true },
      }),
      this.prisma.block.findMany({
        where: { OR: [{ blockerId: selfId }, { blockedId: selfId }] },
        select: { blockerId: true, blockedId: true },
      }),
    ]);

    const excludedIds = new Set([selfId, ...decided.map((d) => d.targetId)]);
    blockedEitherDirection.forEach((b) => {
      excludedIds.add(b.blockerId === selfId ? b.blockedId : b.blockerId);
    });

    const selfPreferredGenders = selfPreference.genderPreference.includes('ANY')
      ? null
      : selfPreference.genderPreference.filter((g) => GENDER_VALUES.includes(g));

    // Over-fetch since the reciprocal-preference check below runs in JS (see
    // candidatePreferenceAllowsSelf) — the DB query alone can't express it
    // reliably, so we filter after fetching and still return up to `limit`.
    const overFetchTake = Math.min(limit * 3, 200);
    const rawBatch = await this.prisma.profile.findMany({
      where: {
        isComplete: true,
        userId: { notIn: Array.from(excludedIds) },
        birthdate: birthdateRangeForAges(selfPreference.ageMin, selfPreference.ageMax),
        ...(selfPreferredGenders && selfPreferredGenders.length > 0
          ? { gender: { in: selfPreferredGenders } }
          : {}),
        user: { status: 'ACTIVE' },
      },
      include: { photos: true, user: { include: { preference: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      take: overFetchTake,
    });

    const filtered = rawBatch
      .filter((p) => candidatePreferenceAllowsSelf(p.user.preference, selfProfile.gender))
      .slice(0, limit);

    const nextCursor = rawBatch.length === overFetchTake ? rawBatch[rawBatch.length - 1].id : null;
    return { candidates: filtered.map(toPublicView), nextCursor };
  }
}
