import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

/**
 * API-layer tests (docs/10-testing-strategy.md) against the real running dev
 * stack (docker-compose Postgres + Redis) rather than a mocked DB, per global
 * CLAUDE.md §5. Known simplification (tracked in TASKS.md): this currently
 * targets the shared local dev server rather than an ephemeral testcontainers
 * instance — graduating to per-run isolated containers is a follow-up before
 * this suite runs unattended in CI.
 *
 * Requires `docker compose up -d` and the API dev server already running
 * (`npm run dev:api`) on BASE_URL (default http://localhost:4000).
 */
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';
const runId = Date.now();

function uniqueEmail(label) {
  return `${label}-${runId}@example.com`;
}

describe('Auth + Profile (FR-01, FR-02)', () => {
  const email = uniqueEmail('flow');
  const password = 'SuperSecret123';
  let agent;
  let verificationToken;

  beforeAll(() => {
    agent = request.agent(BASE_URL);
  });

  it('rejects registration with a weak password', async () => {
    const res = await request(BASE_URL)
      .post('/v1/auth/register')
      .send({ email: uniqueEmail('weak'), password: 'short', birthdate: '1995-01-01' });
    expect(res.status).toBe(400);
    expect(res.body.title).toBe('BadRequest');
  });

  it('rejects registration for an under-18 birthdate', async () => {
    const res = await request(BASE_URL)
      .post('/v1/auth/register')
      .send({ email: uniqueEmail('minor'), password, birthdate: '2015-01-01' });
    expect(res.status).toBe(400);
    expect(res.body.detail).toMatch(/18 years old/);
  });

  it('registers a new user and returns a generic 202 with a dev-only verification token', async () => {
    const res = await request(BASE_URL)
      .post('/v1/auth/register')
      .send({ email, password, birthdate: '1995-01-01' });
    expect(res.status).toBe(202);
    expect(res.body.verificationToken).toBeTruthy();
    verificationToken = res.body.verificationToken;
  });

  it('does not reveal whether an email already exists on re-registration (anti-enumeration)', async () => {
    const res = await request(BASE_URL)
      .post('/v1/auth/register')
      .send({ email, password, birthdate: '1995-01-01' });
    expect(res.status).toBe(202);
    expect(res.body.message).toMatch(/verification link/i);
  });

  it('rejects login before email verification', async () => {
    const res = await request(BASE_URL).post('/v1/auth/login').send({ email, password });
    expect(res.status).toBe(401);
  });

  it('verifies the email', async () => {
    const res = await request(BASE_URL)
      .post('/v1/auth/verify-email')
      .send({ token: verificationToken });
    expect(res.status).toBe(201); // Nest default for POST with no @HttpCode override
  });

  it('rejects login with the wrong password', async () => {
    const res = await request(BASE_URL)
      .post('/v1/auth/login')
      .send({ email, password: 'WrongPassword123' });
    expect(res.status).toBe(401);
  });

  it('logs in successfully and establishes a session', async () => {
    const res = await agent.post('/v1/auth/login').send({ email, password });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
  });

  it('rejects unauthenticated access to /v1/profiles/me', async () => {
    const res = await request(BASE_URL).get('/v1/profiles/me');
    expect(res.status).toBe(401);
  });

  it('returns 404 before a profile has been created', async () => {
    const res = await agent.get('/v1/profiles/me');
    expect(res.status).toBe(404);
  });

  it('creates a profile and reports isComplete=false with zero photos', async () => {
    const res = await agent
      .patch('/v1/profiles/me')
      .send({ name: 'E2E Tester', birthdate: '1995-01-01', gender: 'MAN', bio: 'hi' });
    expect(res.status).toBe(200);
    expect(res.body.isComplete).toBe(false);
  });

  it('rejects a bio over the 500-char limit', async () => {
    const res = await agent.patch('/v1/profiles/me').send({ bio: 'x'.repeat(501) });
    expect(res.status).toBe(400);
  });

  it('exposes preferences with safe defaults, including humbleMatchOptOut', async () => {
    const res = await agent.get('/v1/preferences/me');
    expect(res.status).toBe(200);
    expect(res.body.humbleMatchOptOut).toBe(false);
  });

  it('completes the two-step photo upload flow and flips isComplete to true', async () => {
    const jpegHeader = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    ]);

    const uploadUrlRes = await agent.post('/v1/profiles/me/photos/upload-url');
    expect(uploadUrlRes.status).toBe(201);
    const { photoId, uploadUrl } = uploadUrlRes.body;

    const putRes = await agent
      .put(uploadUrl)
      .set('Content-Type', 'application/octet-stream')
      .send(jpegHeader);
    expect(putRes.status).toBe(200);

    const confirmRes = await agent.post(`/v1/profiles/me/photos/${photoId}/confirm`);
    expect(confirmRes.status).toBe(201);
    expect(confirmRes.body.moderationStatus).toBe('APPROVED');

    const profileRes = await agent.get('/v1/profiles/me');
    expect(profileRes.body.isComplete).toBe(true);
  });

  it('rejects a non-image upload at confirm time (magic-byte check)', async () => {
    const uploadUrlRes = await agent.post('/v1/profiles/me/photos/upload-url');
    const { photoId, uploadUrl } = uploadUrlRes.body;
    await agent
      .put(uploadUrl)
      .set('Content-Type', 'application/octet-stream')
      .send(Buffer.from('not an image'));
    const confirmRes = await agent.post(`/v1/profiles/me/photos/${photoId}/confirm`);
    expect(confirmRes.status).toBe(400);
  });

  it("never leaks another user's birthdate/email via the public profile projection", async () => {
    const meRes = await agent.get('/v1/profiles/me');
    const publicRes = await agent.get(`/v1/profiles/${meRes.body.userId}`);
    expect(publicRes.status).toBe(200);
    expect(publicRes.body.birthdate).toBeUndefined();
    expect(publicRes.body.email).toBeUndefined();
    expect(publicRes.body.age).toBeTypeOf('number');
  });
});
