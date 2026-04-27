const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', 'backend', '.env') });

const serverless = require('serverless-http');
const { app, prepare } = require('../backend/src/app');

let handlerPromise;

function getHandler() {
  if (!handlerPromise) {
    handlerPromise = prepare().then(() => serverless(app));
  }

  return handlerPromise;
}

module.exports = async (req, res) => {
  const handler = await getHandler();
  return handler(req, res);
};