import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createVerifiedUser } from '../../../test-support/testUser';

/**
 * FR-03/04/05/06 (docs/01-prd.md) API-layer tests against the real running
 * dev stack — see the header comment in auth-profile.e2e.test.js for the
 * disclosed testcontainers-isolation follow-up this suite shares.
 */
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';

describe('Discovery + Matching (FR-03/04/05/06)', () => {
  it('rejects unauthenticated candidate requests', async () => {
    const res = await request(BASE_URL).get('/v1/discovery/candidates');
    expect(res.status).toBe(401);
  });

  it('excludes self and incomplete profiles from candidates', async () => {
    const alice = await createVerifiedUser(BASE_URL, 'alice', { gender: 'WOMAN' });
    const incomplete = await createVerifiedUser(BASE_URL, 'incomplete', {
      gender: 'MAN',
      completeProfile: false,
    });

    const res = await alice.agent.get('/v1/discovery/candidates');
    expect(res.status).toBe(200);
    const candidateIds = res.body.candidates.map((c) => c.userId);
    expect(candidateIds).not.toContain(alice.userId);
    expect(candidateIds).not.toContain(incomplete.userId);
  });

  it('mutual LIKE creates a NORMAL match for both parties (INV-10, INV-11)', async () => {
    const alice = await createVerifiedUser(BASE_URL, 'alice-like', { gender: 'WOMAN' });
    const bob = await createVerifiedUser(BASE_URL, 'bob-like', { gender: 'MAN' });

    const first = await alice.agent
      .post('/v1/discovery/decisions')
      .send({ targetId: bob.userId, decision: 'LIKE' });
    expect(first.status).toBe(201);
    expect(first.body.match).toBeNull();

    const second = await bob.agent
      .post('/v1/discovery/decisions')
      .send({ targetId: alice.userId, decision: 'LIKE' });
    expect(second.status).toBe(201);
    expect(second.body.match).not.toBeNull();
    expect(second.body.match.type).toBe('NORMAL');
    expect(second.body.match.counterpart.userId).toBe(alice.userId);

    const aliceMatches = await alice.agent.get('/v1/matches');
    expect(aliceMatches.body.matches.some((m) => m.id === second.body.match.id)).toBe(true);
  });

  it('mutual REJECT creates a HUMBLE match (the signature mechanic)', async () => {
    const alice = await createVerifiedUser(BASE_URL, 'alice-humble', { gender: 'WOMAN' });
    const carol = await createVerifiedUser(BASE_URL, 'carol-humble', { gender: 'WOMAN' });

    await alice.agent
      .post('/v1/discovery/decisions')
      .send({ targetId: carol.userId, decision: 'REJECT' });
    const res = await carol.agent
      .post('/v1/discovery/decisions')
      .send({ targetId: alice.userId, decision: 'REJECT' });

    expect(res.body.match.type).toBe('HUMBLE');
  });

  it('disagreeing decisions never create a match, in either order (rejection has dignity)', async () => {
    const alice = await createVerifiedUser(BASE_URL, 'alice-disagree', { gender: 'WOMAN' });
    const bob = await createVerifiedUser(BASE_URL, 'bob-disagree', { gender: 'MAN' });

    await alice.agent
      .post('/v1/discovery/decisions')
      .send({ targetId: bob.userId, decision: 'LIKE' });
    const res = await bob.agent
      .post('/v1/discovery/decisions')
      .send({ targetId: alice.userId, decision: 'REJECT' });

    expect(res.body.match).toBeNull();
  });

  it('honors humbleMatchOptOut — a mutual reject never becomes a Humble Match (INV-12)', async () => {
    const alice = await createVerifiedUser(BASE_URL, 'alice-optout', { gender: 'WOMAN' });
    const dave = await createVerifiedUser(BASE_URL, 'dave-optout', {
      gender: 'MAN',
      humbleMatchOptOut: true,
    });

    await alice.agent
      .post('/v1/discovery/decisions')
      .send({ targetId: dave.userId, decision: 'REJECT' });
    const res = await dave.agent
      .post('/v1/discovery/decisions')
      .send({ targetId: alice.userId, decision: 'REJECT' });

    expect(res.body.match).toBeNull();
  });

  it('resubmitting the same decision is idempotent and returns the same match (INV-11)', async () => {
    const alice = await createVerifiedUser(BASE_URL, 'alice-idem', { gender: 'WOMAN' });
    const bob = await createVerifiedUser(BASE_URL, 'bob-idem', { gender: 'MAN' });

    await alice.agent
      .post('/v1/discovery/decisions')
      .send({ targetId: bob.userId, decision: 'LIKE' });
    const firstMatch = await bob.agent
      .post('/v1/discovery/decisions')
      .send({ targetId: alice.userId, decision: 'LIKE' });
    const resubmit = await alice.agent
      .post('/v1/discovery/decisions')
      .send({ targetId: bob.userId, decision: 'LIKE' });

    expect(resubmit.body.match.id).toBe(firstMatch.body.match.id);

    const list = await alice.agent.get('/v1/matches');
    const matchesWithBob = list.body.matches.filter((m) => m.counterpart.userId === bob.userId);
    expect(matchesWithBob).toHaveLength(1); // no duplicate Match row
  });

  it('rejects deciding on an ineligible target (e.g. an incomplete profile), even if crafted directly', async () => {
    const alice = await createVerifiedUser(BASE_URL, 'alice-ineligible', { gender: 'WOMAN' });
    const incomplete = await createVerifiedUser(BASE_URL, 'incomplete-target', {
      gender: 'MAN',
      completeProfile: false,
    });

    const res = await alice.agent
      .post('/v1/discovery/decisions')
      .send({ targetId: incomplete.userId, decision: 'LIKE' });
    expect(res.status).toBe(403);
  });

  it('rejects deciding on oneself', async () => {
    const alice = await createVerifiedUser(BASE_URL, 'alice-self', { gender: 'WOMAN' });
    const res = await alice.agent
      .post('/v1/discovery/decisions')
      .send({ targetId: alice.userId, decision: 'LIKE' });
    expect(res.status).toBe(403);
  });

  it("object-level authorization: a non-participant cannot fetch or unmatch someone else's match", async () => {
    const alice = await createVerifiedUser(BASE_URL, 'alice-authz', { gender: 'WOMAN' });
    const bob = await createVerifiedUser(BASE_URL, 'bob-authz', { gender: 'MAN' });
    const eve = await createVerifiedUser(BASE_URL, 'eve-authz', { gender: 'WOMAN' });

    await alice.agent
      .post('/v1/discovery/decisions')
      .send({ targetId: bob.userId, decision: 'LIKE' });
    const matchRes = await bob.agent
      .post('/v1/discovery/decisions')
      .send({ targetId: alice.userId, decision: 'LIKE' });
    const matchId = matchRes.body.match.id;

    const getRes = await eve.agent.get(`/v1/matches/${matchId}`);
    expect(getRes.status).toBe(404);

    const unmatchRes = await eve.agent.post(`/v1/matches/${matchId}/unmatch`);
    expect(unmatchRes.status).toBe(404);
  });
});
