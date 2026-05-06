/**
 * Entry for PaaS hosts (e.g. Timeweb "Node + Express" preset) that expect
 * `node <file>.js` instead of `npx next start`.
 *
 * After `next build`, this behaves like `next start`, but binds to PORT / 0.0.0.0.
 */
'use strict';

const http = require('http');
const { parse } = require('url');
const next = require('next');

// Hosts often omit NODE_ENV for the start step; Next needs production for `.next` output.
if (process.env.NODE_ENV === undefined) {
  process.env.NODE_ENV = 'production';
}

const hostname = process.env.HOST || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

if (Number.isNaN(port) || port < 1) {
  console.error('Invalid PORT:', process.env.PORT);
  process.exit(1);
}

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    http
      .createServer(async (req, res) => {
        try {
          const parsedUrl = parse(req.url, true);
          await handle(req, res, parsedUrl);
        } catch (e) {
          console.error('Request handler error', req.url, e);
          res.statusCode = 500;
          res.end('internal server error');
        }
      })
      .listen(port, hostname, (err) => {
        if (err) throw err;
        console.log(`> Ready on http://${hostname}:${port}`);
      });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
