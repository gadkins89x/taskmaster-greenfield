import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/database/prisma.service';
import { v4 as uuid } from 'uuid';
import * as crypto from 'crypto';

interface TokenPayload {
  userId: string;
  email: string;
  tenantId: string;
  permissions: string[];
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async generateAccessToken(payload: TokenPayload) {
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '15m');

    const accessToken = this.jwtService.sign({
      sub: payload.userId,
      email: payload.email,
      tenantId: payload.tenantId,
      permissions: payload.permissions,
    });

    // Parse expiresIn to seconds
    const expiresInSeconds = this.parseExpiresIn(expiresIn);

    return { accessToken, expiresIn: expiresInSeconds };
  }

  async generateRefreshToken(userId: string, deviceInfo?: string) {
    const token = uuid();
    const tokenHash = this.hashToken(token);
    const expiresIn = this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN', '7d');
    const expiresAt = new Date(Date.now() + this.parseExpiresIn(expiresIn) * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        deviceInfo,
        expiresAt,
      },
    });

    return token;
  }

  async validateRefreshToken(token: string) {
    const tokenHash = this.hashToken(token);

    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (refreshToken.expiresAt < new Date()) {
      await this.prisma.refreshToken.delete({ where: { id: refreshToken.id } });
      throw new UnauthorizedException('Refresh token expired');
    }

    return { userId: refreshToken.userId };
  }

  async revokeRefreshToken(token: string) {
    const tokenHash = this.hashToken(token);

    await this.prisma.refreshToken.deleteMany({
      where: { tokenHash },
    });
  }

  async revokeAllUserTokens(userId: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // default 15 minutes

    const [, value, unit] = match;
    const num = parseInt(value, 10);

    switch (unit) {
      case 's': return num;
      case 'm': return num * 60;
      case 'h': return num * 60 * 60;
      case 'd': return num * 60 * 60 * 24;
      default: return 900;
    }
  }
}
