import { Injectable, Dependencies, ForbiddenException, NotFoundException } from '@nestjs/common';
import { normalizePair, evaluateMatchOutcome } from '@humble/domain';
import { PRISMA } from '../../common/database/database.module';
import { toPublicView } from '../profiles/profiles.service';
import { DiscoveryService } from '../discovery/discovery.service';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/**
 * FR-04/05/06 (docs/01-prd.md): decision submission and Normal/Humble Match
 * evaluation. The transaction here is the concrete implementation of
 * docs/06-lld.md §4 and INV-10/INV-11 (server-only match creation, idempotent
 * decisions, no duplicate match rows even under concurrent submission).
 */
@Injectable()
@Dependencies(PRISMA, DiscoveryService)
export class MatchingService {
  constructor(prisma, discoveryService) {
    this.prisma = prisma;
    this.discoveryService = discoveryService;
  }

  async submitDecision(deciderId, targetId, decision) {
    const eligible = await this.discoveryService.isEligibleCandidate(deciderId, targetId);
    if (!eligible) {
      throw new ForbiddenException('This profile is not currently a valid discovery candidate');
    }

    await this._recordDecisionIfNew(deciderId, targetId, decision);
    const match = await this._findExistingMatch(deciderId, targetId);
    return { decision, match: match ? await this._toMatchSummary(match, deciderId) : null };
  }

  /**
   * Concurrency note (deviates from the FOR-UPDATE pseudocode sketched in
   * docs/06-lld.md §4 in favor of a simpler mechanism with the same
   * guarantee): each request inserts its own decision row FIRST, then reads
   * for the reverse row. Because "insert own row" happens-before "read for
   * the other's row" within a single request, it is impossible for two
   * concurrent, opposite requests to both miss each other — whichever
   * request's insert commits second is guaranteed to see the first request's
   * already-committed row when it reads. Both requests attempting to create
   * the Match is handled by the Match table's unique pair constraint (caught
   * below as P2002), so at-least-one-fires and at-most-one-persists both
   * hold without needing serializable isolation.
   */
  async _recordDecisionIfNew(deciderId, targetId, decision) {
    let created;
    try {
      created = await this.prisma.discoveryDecision.create({
        data: { deciderId, targetId, decision },
      });
    } catch (err) {
      if (err.code === UNIQUE_CONSTRAINT_VIOLATION) {
        return; // Decision is final (docs/06-lld.md §4) — resubmission is a no-op.
      }
      throw err;
    }

    const reverse = await this.prisma.discoveryDecision.findUnique({
      where: { deciderId_targetId: { deciderId: targetId, targetId: deciderId } },
    });
    if (!reverse) return created;

    const [deciderPref, targetPref] = await Promise.all([
      this.prisma.preference.findUnique({ where: { userId: deciderId } }),
      this.prisma.preference.findUnique({ where: { userId: targetId } }),
    ]);

    const matchType = evaluateMatchOutcome(decision, reverse.decision, {
      deciderOptedOutOfHumble: deciderPref?.humbleMatchOptOut ?? false,
      targetOptedOutOfHumble: targetPref?.humbleMatchOptOut ?? false,
    });
    if (!matchType) return created;

    const { userLowId, userHighId } = normalizePair(deciderId, targetId);
    try {
      await this.prisma.match.create({ data: { userLowId, userHighId, type: matchType } });
    } catch (err) {
      if (err.code !== UNIQUE_CONSTRAINT_VIOLATION) throw err; // INV-10: at most one Match per pair
    }
    return created;
  }

  async _findExistingMatch(userAId, userBId) {
    const { userLowId, userHighId } = normalizePair(userAId, userBId);
    return this.prisma.match.findUnique({
      where: { userLowId_userHighId: { userLowId, userHighId } },
    });
  }

  async listForUser(userId, { cursor, limit }) {
    const matches = await this.prisma.match.findMany({
      where: { OR: [{ userLowId: userId }, { userHighId: userId }] },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      take: limit,
    });
    const summaries = await Promise.all(matches.map((m) => this._toMatchSummary(m, userId)));
    const nextCursor = matches.length === limit ? matches[matches.length - 1].id : null;
    return { matches: summaries, nextCursor };
  }

  async getOne(userId, matchId) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match || (match.userLowId !== userId && match.userHighId !== userId)) {
      throw new NotFoundException('Match not found');
    }
    return this._toMatchSummary(match, userId);
  }

  async unmatch(userId, matchId) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match || (match.userLowId !== userId && match.userHighId !== userId)) {
      throw new NotFoundException('Match not found');
    }
    await this.prisma.match.update({ where: { id: matchId }, data: { status: 'UNMATCHED' } });
  }

  async _toMatchSummary(match, viewerId) {
    const counterpartId = match.userLowId === viewerId ? match.userHighId : match.userLowId;
    const counterpartProfile = await this.prisma.profile.findUnique({
      where: { userId: counterpartId },
      include: { photos: true },
    });
    return {
      id: match.id,
      type: match.type,
      status: match.status,
      createdAt: match.createdAt,
      counterpart: counterpartProfile ? toPublicView(counterpartProfile) : null,
    };
  }
}
