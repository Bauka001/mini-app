// Vercel serverless function entry for the Express backend.
//
// Vercel routes any request matching /api/<anything> to this file. We
// delegate handling to the existing Express app. Two prefix conventions
// coexist in the codebase:
//
//   1. Top-level routes are mounted WITHOUT /api prefix in Express
//      (`app.post('/auth/verify', ...)`, `/payments/stars/*`, etc.).
//      For these we strip the `/api` prefix here so the request matches.
//
//   2. Admin Panel V2 routes are mounted WITH the `/api/admin-v2/*`
//      prefix in Express (historical reason: same router served the
//      admin browser fetch() calls under that path). We must NOT strip
//      `/api` for these or they'd 404.
//
//   3. The admin HTML page is served by Express at `/admin` (no /api).
//      Vercel rewrites `/admin` → `/api/admin`, so the request URL here
//      is `/api/admin`. Strip the `/api` so Express sees `/admin`.
//
// This same `server/index.js` still runs as a standalone process in local
// dev (`node server/index.js`) — only the listener is gated on
// `require.main === module`, so importing it here is a no-op except for
// returning the `app` instance.

const app = require('../server/index.js');

module.exports = (req, res) => {
  if (typeof req.url === 'string') {
    if (req.url === '/api') {
      req.url = '/';
    } else if (req.url.startsWith('/api/admin-v2/') || req.url === '/api/admin-v2') {
      // Leave admin-v2 paths intact — Express routes include the /api prefix.
    } else if (req.url.startsWith('/api/')) {
      req.url = req.url.slice(4) || '/';
    }
  }
  return app(req, res);
};
