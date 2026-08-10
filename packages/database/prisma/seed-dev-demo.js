// Dev-only convenience seed: creates a handful of demo accounts with complete
// profiles and a pre-arranged Normal Match + Humble Match, via the real HTTP
// API (never inserted directly into the DB) so every invariant/validation
// path runs exactly as it would for a real user.
//
// NOT part of the production seed (packages/database/prisma/seed.js) — do not
// wire this into `prisma migrate deploy`/`db seed`. Run manually:
//   node packages/database/prisma/seed-dev-demo.js
// Requires the API dev server running on API_BASE_URL (default :4000).

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';
const PASSWORD = 'DemoPass123!';

const USERS = [
  {
    key: 'alex',
    email: 'demo.alex@humble.app',
    name: 'Alex',
    gender: 'MAN',
    birthdate: '1996-01-15',
  },
  {
    key: 'blair',
    email: 'demo.blair@humble.app',
    name: 'Blair',
    gender: 'WOMAN',
    birthdate: '1997-03-22',
  },
  {
    key: 'casey',
    email: 'demo.casey@humble.app',
    name: 'Casey',
    gender: 'WOMAN',
    birthdate: '1995-07-09',
  },
  {
    key: 'drew',
    email: 'demo.drew@humble.app',
    name: 'Drew',
    gender: 'MAN',
    birthdate: '1994-11-30',
  },
];

const JPEG_HEADER = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);

async function json(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

class Session {
  constructor() {
    this.cookie = null;
  }
  async request(path, { method = 'GET', body } = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        ...(body && !Buffer.isBuffer(body) ? { 'Content-Type': 'application/json' } : {}),
        ...(Buffer.isBuffer(body) ? { 'Content-Type': 'application/octet-stream' } : {}),
        ...(this.cookie ? { Cookie: this.cookie } : {}),
      },
      body: body ? (Buffer.isBuffer(body) ? body : JSON.stringify(body)) : undefined,
      redirect: 'manual',
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) this.cookie = setCookie.split(';')[0];
    return { status: res.status, body: await json(res) };
  }
}

async function createDemoUser(user) {
  const session = new Session();
  const reg = await session.request('/v1/auth/register', {
    method: 'POST',
    body: { email: user.email, password: PASSWORD, birthdate: user.birthdate },
  });
  const token = reg.body.verificationToken;
  if (token) {
    await session.request('/v1/auth/verify-email', { method: 'POST', body: { token } });
  }
  await session.request('/v1/auth/login', {
    method: 'POST',
    body: { email: user.email, password: PASSWORD },
  });

  await session.request('/v1/profiles/me', {
    method: 'PATCH',
    body: {
      name: user.name,
      birthdate: user.birthdate,
      gender: user.gender,
      bio: `Hi, I'm ${user.name}.`,
    },
  });

  const upload = await session.request('/v1/profiles/me/photos/upload-url', { method: 'POST' });
  await session.request(upload.body.uploadUrl, { method: 'PUT', body: JPEG_HEADER });
  await session.request(`/v1/profiles/me/photos/${upload.body.photoId}/confirm`, {
    method: 'POST',
  });

  const me = await session.request('/v1/auth/session');
  return { ...user, password: PASSWORD, userId: me.body.userId, session };
}

async function main() {
  const created = {};
  for (const user of USERS) {
    created[user.key] = await createDemoUser(user);
    console.log(`Created ${user.name} <${user.email}>`);
  }

  // Alex <-> Blair: mutual LIKE => Normal Match
  await created.alex.session.request('/v1/discovery/decisions', {
    method: 'POST',
    body: { targetId: created.blair.userId, decision: 'LIKE' },
  });
  await created.blair.session.request('/v1/discovery/decisions', {
    method: 'POST',
    body: { targetId: created.alex.userId, decision: 'LIKE' },
  });

  // Alex <-> Casey: mutual REJECT => Humble Match
  await created.alex.session.request('/v1/discovery/decisions', {
    method: 'POST',
    body: { targetId: created.casey.userId, decision: 'REJECT' },
  });
  await created.casey.session.request('/v1/discovery/decisions', {
    method: 'POST',
    body: { targetId: created.alex.userId, decision: 'REJECT' },
  });

  console.log('\n=== Demo credentials (password for all: DemoPass123!) ===');
  for (const user of USERS) {
    console.log(`${user.name.padEnd(6)} ${user.email}`);
  }
  console.log('\nAlex <-> Blair: Normal Match (both already decided LIKE)');
  console.log('Alex <-> Casey: Humble Match (both already decided REJECT)');
  console.log('Drew: fresh account, no decisions yet — good for testing the swipe flow.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
