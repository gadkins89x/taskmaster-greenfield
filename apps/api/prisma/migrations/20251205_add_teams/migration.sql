-- CreateTable: Teams (Internal Multi-Tenancy)
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable: User-Team junction
CREATE TABLE "user_teams" (
    "user_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_teams_pkey" PRIMARY KEY ("user_id","team_id")
);

-- Add team_id to existing tables
ALTER TABLE "locations" ADD COLUMN "team_id" UUID;
ALTER TABLE "assets" ADD COLUMN "team_id" UUID;
ALTER TABLE "work_orders" ADD COLUMN "team_id" UUID;
ALTER TABLE "maintenance_schedules" ADD COLUMN "team_id" UUID;
ALTER TABLE "inventory_items" ADD COLUMN "team_id" UUID;

-- CreateIndex: Teams
CREATE UNIQUE INDEX "teams_tenant_id_code_key" ON "teams"("tenant_id", "code");
CREATE INDEX "teams_tenant_id_idx" ON "teams"("tenant_id");

-- CreateIndex: User-Teams
CREATE INDEX "user_teams_team_id_idx" ON "user_teams"("team_id");

-- CreateIndex: Team foreign keys on entities
CREATE INDEX "locations_team_id_idx" ON "locations"("team_id");
CREATE INDEX "assets_team_id_idx" ON "assets"("team_id");
CREATE INDEX "work_orders_team_id_idx" ON "work_orders"("team_id");
CREATE INDEX "maintenance_schedules_team_id_idx" ON "maintenance_schedules"("team_id");
CREATE INDEX "inventory_items_team_id_idx" ON "inventory_items"("team_id");

-- AddForeignKey: Teams -> Tenant
ALTER TABLE "teams" ADD CONSTRAINT "teams_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: User-Teams -> User
ALTER TABLE "user_teams" ADD CONSTRAINT "user_teams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: User-Teams -> Team
ALTER TABLE "user_teams" ADD CONSTRAINT "user_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Entity team references
ALTER TABLE "locations" ADD CONSTRAINT "locations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assets" ADD CONSTRAINT "assets_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
