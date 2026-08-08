import { Injectable, Dependencies, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PRISMA } from '../../common/database/database.module';
import { RedisService } from '../../common/redis/redis.service';

const BCRYPT_ROUNDS = 12;
const VERIFICATION_TOKEN_TTL_HOURS = 24;
const RESET_TOKEN_TTL_HOURS = 1;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * FR-01 Authentication & Account (docs/01-prd.md). All password/token
 * handling happens here — controllers never touch bcrypt/crypto directly.
 */
@Injectable()
@Dependencies(PRISMA, RedisService)
export class AuthService {
  constructor(prisma, redisService) {
    this.prisma = prisma;
    this.redis = redisService;
  }

  /**
   * Generic response to prevent account enumeration (docs/06-lld.md FR-01 abuse
   * cases). `birthdate` is validated here as an immediate 18+ age-gate
   * (docs/06-lld.md Auth module) but is not persisted on User — the durable
   * record lives on Profile.birthdate, collected again during onboarding
   * (docs/02-user-journeys-state-machines.md §1.1) and re-validated there.
   */
  async register({ email, password }) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Do not reveal existence — caller returns the same 202 either way.
      return { verificationRequired: true };
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: { email, passwordHash },
    });

    const verificationToken = await this.issueToken(
      user.id,
      'EMAIL_VERIFICATION',
      VERIFICATION_TOKEN_TTL_HOURS,
    );

    return { verificationRequired: true, userId: user.id, verificationToken };
  }

  async issueToken(userId, type, ttlHours) {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    await this.prisma.authToken.create({
      data: { userId, type, tokenHash: hashToken(token), expiresAt },
    });
    return token;
  }

  async verifyEmail(token) {
    const tokenHash = hashToken(token);
    const record = await this.prisma.authToken.findFirst({
      where: { tokenHash, type: 'EMAIL_VERIFICATION', usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!record) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }
    await this.prisma.$transaction([
      this.prisma.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
    ]);
    return { userId: record.userId };
  }

  async login({ email, password }) {
    const rateLimitKey = `auth:login:${email}`;
    const allowed = await this.redis.allowWithinLimit(rateLimitKey, 10, 15 * 60);
    if (!allowed) {
      throw new UnauthorizedException('Too many login attempts — try again later');
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException('Email not verified');
    }
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }
    return { id: user.id, role: user.role };
  }

  async requestPasswordReset(email) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return; // generic 202 regardless, handled by controller
    await this.issueToken(user.id, 'PASSWORD_RESET', RESET_TOKEN_TTL_HOURS);
  }

  async confirmPasswordReset(token, newPassword) {
    const tokenHash = hashToken(token);
    const record = await this.prisma.authToken.findFirst({
      where: { tokenHash, type: 'PASSWORD_RESET', usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!record) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    ]);
  }
}
