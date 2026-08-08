import { Global, Module } from '@nestjs/common';
import { getPrismaClient } from '@humble/database';

export const PRISMA = 'PRISMA';

@Global()
@Module({
  providers: [{ provide: PRISMA, useFactory: () => getPrismaClient() }],
  exports: [PRISMA],
})
export class DatabaseModule {}
