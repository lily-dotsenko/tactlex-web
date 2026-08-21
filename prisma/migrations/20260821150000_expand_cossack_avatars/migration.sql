ALTER TABLE "user_profiles" DROP CONSTRAINT "user_profiles_avatar_key_check";

ALTER TABLE "user_profiles"
  ADD CONSTRAINT "user_profiles_avatar_key_check" CHECK (
    "avatar_key" IN (
      'atlas-olive', 'echo-navy', 'nova-blue', 'vector-graphite',
      'scout-sand', 'mira-night', 'fox-olive', 'amber-yellow',
      'pixel-violet', 'ranger-gray', 'sage-yellow', 'sky-blue',
      'onyx-blue', 'willow-olive', 'comet-navy', 'sunny-yellow',
      'zone-ember', 'zone-lamp', 'zone-hood', 'zone-spark',
      'zone-veteran', 'zone-goggle', 'zone-orbit', 'zone-teal',
      'zone-canary', 'zone-moss', 'zone-braid', 'zone-rust',
      'zone-glass', 'zone-violet', 'zone-frost', 'zone-wanderer',
      'cossack-blue', 'cossack-sunflower', 'cossack-gray', 'cossack-ribbon',
      'cossack-snow', 'cossack-olive', 'cossack-viburnum', 'cossack-rust',
      'cossack-scarf', 'cossack-silver', 'cossack-bloom', 'cossack-steppe',
      'cossack-fur', 'cossack-coral', 'cossack-sky', 'cossack-night'
    )
  );
