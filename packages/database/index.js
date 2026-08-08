const { PrismaClient } = require('@prisma/client');

/**
 * Single shared Prisma client instance. NestJS modules inject this rather
 * than each constructing their own — one connection pool per process.
 */
let prisma;

function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }
  return prisma;
}

module.exports = { getPrismaClient };
