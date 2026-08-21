CREATE TABLE "cosmetic_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" VARCHAR(100) NOT NULL,
  "type" VARCHAR(40) NOT NULL,
  "title_uk" VARCHAR(180) NOT NULL,
  "title_en" VARCHAR(180) NOT NULL,
  "description_uk" TEXT NOT NULL,
  "description_en" TEXT NOT NULL,
  "price_coins" INTEGER NOT NULL,
  "metadata" JSONB,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "cosmetic_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cosmetic_items_code_key" ON "cosmetic_items"("code");
CREATE INDEX "cosmetic_items_type_is_active_display_order_idx" ON "cosmetic_items"("type", "is_active", "display_order");

CREATE TABLE "user_cosmetics" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "cosmetic_id" UUID NOT NULL,
  "acquired_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_cosmetics_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_cosmetics_user_id_cosmetic_id_key" ON "user_cosmetics"("user_id", "cosmetic_id");
CREATE INDEX "user_cosmetics_cosmetic_id_idx" ON "user_cosmetics"("cosmetic_id");

CREATE TABLE "league_seasons" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "slug" VARCHAR(80) NOT NULL,
  "starts_at" TIMESTAMPTZ(3) NOT NULL,
  "ends_at" TIMESTAMPTZ(3) NOT NULL,
  "finalized_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "league_seasons_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "league_seasons_slug_key" ON "league_seasons"("slug");
CREATE INDEX "league_seasons_starts_at_ends_at_idx" ON "league_seasons"("starts_at", "ends_at");

CREATE TABLE "league_groups" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "season_id" UUID NOT NULL,
  "division" "LeagueDivision" NOT NULL,
  "group_number" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "league_groups_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "league_groups_season_id_division_group_number_key" ON "league_groups"("season_id", "division", "group_number");
CREATE INDEX "league_groups_season_id_division_idx" ON "league_groups"("season_id", "division");

CREATE TABLE "league_memberships" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "season_id" UUID NOT NULL,
  "group_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "weekly_xp" INTEGER NOT NULL DEFAULT 0,
  "reached_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finalized_at" TIMESTAMPTZ(3),
  CONSTRAINT "league_memberships_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "league_memberships_season_id_user_id_key" ON "league_memberships"("season_id", "user_id");
CREATE INDEX "league_memberships_group_id_weekly_xp_reached_at_idx" ON "league_memberships"("group_id", "weekly_xp" DESC, "reached_at");
CREATE INDEX "league_memberships_user_id_season_id_idx" ON "league_memberships"("user_id", "season_id");

ALTER TABLE "user_cosmetics" ADD CONSTRAINT "user_cosmetics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_cosmetics" ADD CONSTRAINT "user_cosmetics_cosmetic_id_fkey" FOREIGN KEY ("cosmetic_id") REFERENCES "cosmetic_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "league_groups" ADD CONSTRAINT "league_groups_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "league_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "league_memberships" ADD CONSTRAINT "league_memberships_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "league_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "league_memberships" ADD CONSTRAINT "league_memberships_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "league_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "league_memberships" ADD CONSTRAINT "league_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
