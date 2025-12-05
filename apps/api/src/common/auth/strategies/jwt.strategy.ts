import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  tenantId: string;
  permissions: string[];
  teamIds: string[]; // All teams user belongs to
  primaryTeamId: string | null; // User's primary team
  isAdmin: boolean; // Quick check for admin bypass on team filtering
  iat: number;
  exp: number;
}

export interface TenantContext {
  tenantId: string;
  userId: string;
  email: string;
  permissions: string[];
  teamIds: string[]; // All teams user belongs to
  primaryTeamId: string | null; // User's primary team
  isAdmin: boolean; // Quick check for admin bypass on team filtering
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<TenantContext> {
    // Verify user still exists and is active
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, isActive: true, tenantId: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Verify tenant matches
    if (user.tenantId !== payload.tenantId) {
      throw new UnauthorizedException('Invalid tenant context');
    }

    return {
      tenantId: payload.tenantId,
      userId: payload.sub,
      email: payload.email,
      permissions: payload.permissions,
      teamIds: payload.teamIds ?? [],
      primaryTeamId: payload.primaryTeamId ?? null,
      isAdmin: payload.isAdmin ?? false,
    };
  }
}
