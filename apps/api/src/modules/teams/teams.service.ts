import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { TenantContext } from '@/common/auth/strategies/jwt.strategy';
import { CreateTeamDto, UpdateTeamDto, AddTeamMemberDto, UpdateTeamMemberDto } from './dto';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  async create(ctx: TenantContext, dto: CreateTeamDto) {
    // Check for duplicate code
    const existing = await this.prisma.team.findUnique({
      where: {
        tenantId_code: {
          tenantId: ctx.tenantId,
          code: dto.code,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Team with code "${dto.code}" already exists`);
    }

    return this.prisma.team.create({
      data: {
        tenantId: ctx.tenantId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        color: dto.color,
        isActive: dto.isActive ?? true,
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });
  }

  async findAll(ctx: TenantContext, options?: { includeInactive?: boolean }) {
    return this.prisma.team.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(options?.includeInactive ? {} : { isActive: true }),
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(ctx: TenantContext, id: string) {
    const team = await this.prisma.team.findFirst({
      where: {
        id,
        tenantId: ctx.tenantId,
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                isActive: true,
              },
            },
          },
          orderBy: [{ isPrimary: 'desc' }, { joinedAt: 'asc' }],
        },
        _count: {
          select: {
            workOrders: true,
            assets: true,
            inventoryItems: true,
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return team;
  }

  async findByCode(ctx: TenantContext, code: string) {
    const team = await this.prisma.team.findFirst({
      where: {
        code,
        tenantId: ctx.tenantId,
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    if (!team) {
      throw new NotFoundException(`Team with code "${code}" not found`);
    }

    return team;
  }

  async update(ctx: TenantContext, id: string, dto: UpdateTeamDto) {
    const team = await this.prisma.team.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Check for duplicate code if changing
    if (dto.code && dto.code !== team.code) {
      const existing = await this.prisma.team.findFirst({
        where: {
          tenantId: ctx.tenantId,
          code: dto.code,
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException(`Team with code "${dto.code}" already exists`);
      }
    }

    return this.prisma.team.update({
      where: { id },
      data: dto,
      include: {
        _count: {
          select: { members: true },
        },
      },
    });
  }

  async remove(ctx: TenantContext, id: string) {
    const team = await this.prisma.team.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: {
        _count: {
          select: {
            workOrders: true,
            assets: true,
            inventoryItems: true,
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Check if team has associated data
    const hasData =
      team._count.workOrders > 0 ||
      team._count.assets > 0 ||
      team._count.inventoryItems > 0;

    if (hasData) {
      throw new BadRequestException(
        'Cannot delete team with associated work orders, assets, or inventory. Deactivate instead.',
      );
    }

    await this.prisma.team.delete({ where: { id } });
    return { success: true };
  }

  // Team Member Management

  async addMember(ctx: TenantContext, teamId: string, dto: AddTeamMemberDto) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, tenantId: ctx.tenantId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Verify user belongs to same tenant
    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId, tenantId: ctx.tenantId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if already a member
    const existing = await this.prisma.userTeam.findUnique({
      where: {
        userId_teamId: {
          userId: dto.userId,
          teamId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('User is already a member of this team');
    }

    // If setting as primary, unset other primary teams
    if (dto.isPrimary) {
      await this.prisma.userTeam.updateMany({
        where: { userId: dto.userId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return this.prisma.userTeam.create({
      data: {
        userId: dto.userId,
        teamId,
        role: dto.role ?? 'member',
        isPrimary: dto.isPrimary ?? false,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });
  }

  async updateMember(
    ctx: TenantContext,
    teamId: string,
    userId: string,
    dto: UpdateTeamMemberDto,
  ) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, tenantId: ctx.tenantId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const membership = await this.prisma.userTeam.findUnique({
      where: {
        userId_teamId: { userId, teamId },
      },
    });

    if (!membership) {
      throw new NotFoundException('User is not a member of this team');
    }

    // If setting as primary, unset other primary teams
    if (dto.isPrimary) {
      await this.prisma.userTeam.updateMany({
        where: { userId, isPrimary: true, teamId: { not: teamId } },
        data: { isPrimary: false },
      });
    }

    return this.prisma.userTeam.update({
      where: {
        userId_teamId: { userId, teamId },
      },
      data: dto,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async removeMember(ctx: TenantContext, teamId: string, userId: string) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, tenantId: ctx.tenantId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const membership = await this.prisma.userTeam.findUnique({
      where: {
        userId_teamId: { userId, teamId },
      },
    });

    if (!membership) {
      throw new NotFoundException('User is not a member of this team');
    }

    await this.prisma.userTeam.delete({
      where: {
        userId_teamId: { userId, teamId },
      },
    });

    return { success: true };
  }

  async getTeamMembers(ctx: TenantContext, teamId: string) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, tenantId: ctx.tenantId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return this.prisma.userTeam.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            isActive: true,
          },
        },
      },
      orderBy: [{ isPrimary: 'desc' }, { role: 'asc' }, { joinedAt: 'asc' }],
    });
  }

  async getUserTeams(ctx: TenantContext, userId: string) {
    return this.prisma.userTeam.findMany({
      where: {
        userId,
        team: { tenantId: ctx.tenantId },
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            code: true,
            color: true,
            isActive: true,
          },
        },
      },
      orderBy: [{ isPrimary: 'desc' }, { joinedAt: 'asc' }],
    });
  }

  async getUserPrimaryTeam(ctx: TenantContext, userId: string) {
    const membership = await this.prisma.userTeam.findFirst({
      where: {
        userId,
        isPrimary: true,
        team: { tenantId: ctx.tenantId },
      },
      include: {
        team: true,
      },
    });

    return membership?.team ?? null;
  }
}
