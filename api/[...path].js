// Vercel serverless function entry for the Express backend.
//
// Vercel routes any request matching /api/<anything> to this file (the
// catch-all `[...path]` segment). We delegate the actual handling to the
// existing Express app, after stripping the `/api` prefix so routes
// declared as `app.post('/auth/verify', ...)` continue to work unchanged.
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
    } else if (req.url.startsWith('/api/')) {
      req.url = req.url.slice(4) || '/';
    }
  }
  return app(req, res);
};
