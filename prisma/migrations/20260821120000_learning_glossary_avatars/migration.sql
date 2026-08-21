ALTER TYPE "Direction" ADD VALUE IF NOT EXISTS 'MIXED';

ALTER TABLE "user_profiles"
  ADD COLUMN "avatar_key" VARCHAR(40) NOT NULL DEFAULT 'atlas-olive';

ALTER TABLE "user_profiles"
  ADD CONSTRAINT "user_profiles_avatar_key_check" CHECK (
    "avatar_key" IN (
      'atlas-olive',
      'echo-navy',
      'nova-blue',
      'vector-graphite',
      'scout-sand',
      'mira-night',
      'fox-olive',
      'amber-yellow',
      'pixel-violet',
      'ranger-gray',
      'sage-yellow',
      'sky-blue',
      'onyx-blue',
      'willow-olive',
      'comet-navy',
      'sunny-yellow'
    )
  );
