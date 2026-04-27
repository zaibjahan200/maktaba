const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', 'backend', '.env') });

const serverless = require('serverless-http');
const { app, prepare } = require('../backend/src/app');

let handler;
let preparePromise;

function ensurePrepared() {
  if (!preparePromise) {
    preparePromise = prepare().catch((error) => {
      console.warn('Background prepare failed:', error.message);
    });
  }
}

function getHandler() {
  if (!handler) {
    handler = serverless(app);
    ensurePrepared();
  }

  return handler;
}

module.exports = async (req, res) => {
  const currentHandler = getHandler();
  return currentHandler(req, res);
};