'use strict';

function createMiddleware() {
  return function middleware(req, res, next) {
    console.log('middleware1:', 'execute');
    next();
  }
}

module.exports = createMiddleware;
