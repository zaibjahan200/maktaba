const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', 'backend', '.env') });

const { app, prepare } = require('../backend/src/app');

let preparePromise;

function ensurePrepared() {
  if (!preparePromise) {
    preparePromise = prepare().catch((error) => {
      console.warn('Background prepare failed:', error.message);
    });
  }
}

module.exports = async (req, res) => {
  ensurePrepared();

  if (typeof req.url === 'string' && !req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }

  return app(req, res);
};