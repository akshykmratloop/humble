import { Injectable, Dependencies } from '@nestjs/common';
import { PRISMA } from '../../common/database/database.module';

@Injectable()
@Dependencies(PRISMA)
export class PreferencesService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async getOwn(userId) {
    return this.prisma.preference.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  /** humbleMatchOptOut is enforced server-side at match-evaluation time (INV-12) — not client-filtered. */
  async updateOwn(userId, data) {
    return this.prisma.preference.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }
}
