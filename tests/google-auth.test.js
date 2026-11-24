import test from 'node:test';
import assert from 'node:assert/strict';
import authRoutes from '../src/routes/auth.js';

// Helper to find route handler by path and method
function findHandler(router, path, method) {
  const layer = router.stack.find(
    (l) => l.route && l.route.path === path && l.route.methods[method.toLowerCase()]
  );
  if (!layer) throw new Error(`Route ${method} ${path} not found`);
  return layer.route.stack[0].handle;
}

test('Google Auth: GET /google/config returns client configuration', async () => {
  const handler = findHandler(authRoutes, '/google/config', 'get');
  let resultBody = null;
  const res = {
    json(body) {
      resultBody = body;
      return this;
    }
  };

  await handler({}, res);
  assert.ok(resultBody);
  assert.ok(typeof resultBody.clientId === 'string');
  assert.equal(resultBody.configured, true);
  assert.ok(resultBody.clientId.includes('apps.googleusercontent.com'));
});

test('Google Auth: GET /google/url returns properly formatted authorization URL', async () => {
  const handler = findHandler(authRoutes, '/google/url', 'get');
  let resultBody = null;
  const req = {
    protocol: 'http',
    get(header) {
      if (header === 'host') return 'localhost:5000';
      return '';
    }
  };
  const res = {
    json(body) {
      resultBody = body;
      return this;
    }
  };

  await handler(req, res);
  assert.ok(resultBody && resultBody.url);
  assert.ok(resultBody.url.startsWith('https://accounts.google.com/o/oauth2/v2/auth'));
  assert.ok(resultBody.url.includes('response_type=code'));
  assert.ok(resultBody.url.includes('scope=openid'));
  assert.ok(resultBody.url.includes('client_id=567183520-ljk1b11ka5pcan9e9i5nl8om8qqov0qt.apps.googleusercontent.com'));
});

test('Google Auth: POST /google validates required credentials', async () => {
  const handler = findHandler(authRoutes, '/google', 'post');
  let statusCode = 200;
  let resultBody = null;
  const req = {
    body: {}
  };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      resultBody = body;
      return this;
    }
  };

  await handler(req, res);
  assert.equal(statusCode, 400);
  assert.ok(resultBody.error.includes('credential token is required'));
});

test('Google Auth: GET /google/callback handles errors gracefully with redirect', async () => {
  const handler = findHandler(authRoutes, '/google/callback', 'get');
  let redirectUrl = '';
  const req = {
    query: { error: 'access_denied' }
  };
  const res = {
    redirect(url) {
      redirectUrl = url;
    }
  };

  await handler(req, res);
  assert.ok(redirectUrl.includes('auth_error='));
  assert.ok(redirectUrl.includes('access_denied'));
});

test('Google Auth: createUser handles auto-generated passwords without bcrypt undefined error', async () => {
  const { createUser, deleteUser } = await import('../src/db/userRepository.js');
  const testEmail = `test_google_${Date.now()}@bvmcollege.com`;
  const user = await createUser({
    name: 'Google Test User',
    email: testEmail,
    role: 'student'
  });

  assert.ok(user);
  assert.equal(user.email, testEmail);
  assert.equal(user.name, 'Google Test User');

  // Clean up created test user so it doesn't pollute user database
  if (user._id || user.id) {
    await deleteUser(user._id || user.id);
  }
});
