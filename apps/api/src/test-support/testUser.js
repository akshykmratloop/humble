import request from 'supertest';

/**
 * Shared test helper: registers, verifies, logs in, and optionally completes
 * a profile (+ 1 photo, so isComplete=true) for a fresh user against a live
 * running API instance. Used by API-layer tests that need multiple real,
 * authenticated users (docs/10-testing-strategy.md — real DB, no mocks).
 */
export async function createVerifiedUser(
  baseUrl,
  label,
  {
    gender = 'MAN',
    birthdate = '1995-01-01',
    completeProfile = true,
    humbleMatchOptOut = false,
  } = {},
) {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const password = 'SuperSecret123';
  const agent = request.agent(baseUrl);

  const registerRes = await request(baseUrl)
    .post('/v1/auth/register')
    .send({ email, password, birthdate });
  await request(baseUrl)
    .post('/v1/auth/verify-email')
    .send({ token: registerRes.body.verificationToken });
  await agent.post('/v1/auth/login').send({ email, password });

  const sessionRes = await agent.get('/v1/auth/session');
  const userId = sessionRes.body.userId;

  if (completeProfile) {
    await agent
      .patch('/v1/profiles/me')
      .send({ name: label, birthdate, gender, bio: `${label}'s bio` });

    const jpegHeader = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    ]);
    const uploadUrlRes = await agent.post('/v1/profiles/me/photos/upload-url');
    await agent
      .put(uploadUrlRes.body.uploadUrl)
      .set('Content-Type', 'application/octet-stream')
      .send(jpegHeader);
    await agent.post(`/v1/profiles/me/photos/${uploadUrlRes.body.photoId}/confirm`);

    if (humbleMatchOptOut) {
      await agent.patch('/v1/preferences/me').send({ humbleMatchOptOut: true });
    }
  }

  return { agent, userId, email };
}
