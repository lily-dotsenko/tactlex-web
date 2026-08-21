import clsx from "clsx";
import { AVATAR_COLORS, normalizeCustomAvatar } from "@/lib/avatars/custom";

const outline = "#172026";

function CatWeapon({ type }) {
  if (type === "none") return null;
  if (type === "bow") {
    return (
      <g transform="rotate(-18 64 72)" aria-hidden="true">
        <path d="M34 28c25 12 25 68 0 82" fill="none" stroke="#8c633d" strokeWidth="4" />
        <path d="M34 28v82" stroke="#d4d0bd" strokeWidth="1.5" />
      </g>
    );
  }
  if (type === "sabre") {
    return (
      <g transform="rotate(16 95 74)" aria-hidden="true">
        <path d="M98 25c8 36 5 65-7 86" fill="none" stroke="#c9d2d1" strokeWidth="5" />
        <path d="M91 109h15M98 109v11" stroke="#8d6534" strokeWidth="4" strokeLinecap="round" />
      </g>
    );
  }
  const long = type === "marksman-rifle";
  return (
    <g transform="rotate(-18 70 82)" aria-hidden="true">
      <rect
        x={long ? 18 : 25}
        y="91"
        width={long ? 92 : 78}
        height="8"
        rx="3"
        fill="#394143"
        stroke={outline}
        strokeWidth="2"
      />
      <path d="M71 98 62 116h12l9-18Z" fill="#5b4735" stroke={outline} strokeWidth="2" />
      {long ? <rect x="56" y="85" width="27" height="6" rx="3" fill="#20292b" /> : null}
    </g>
  );
}

function CatPattern({ type, coat }) {
  if (type === "solid") return null;
  if (type === "tabby") {
    return (
      <g fill="none" stroke="#563b30" strokeWidth="3" strokeLinecap="round" opacity=".72">
        <path d="M57 31 62 43M70 31 66 43M48 45l8 5M80 45l-8 5M43 58l11 2M85 58l-11 2" />
      </g>
    );
  }
  if (type === "tuxedo") {
    return <path d="M52 63c5-8 19-8 24 0l-3 24c-6 5-13 5-19 0Z" fill="#f4f0e8" opacity=".96" />;
  }
  if (type === "calico") {
    return (
      <g opacity=".9">
        <path d="M39 43c7-13 17-14 24-5l-7 16Z" fill="#f0e8dc" />
        <path d="M70 32c12 2 18 10 17 21l-15 1Z" fill="#262d30" />
        <path d="M71 70c8-6 15-2 16 6-5 9-13 12-21 8Z" fill="#f0e8dc" />
      </g>
    );
  }
  if (type === "point") {
    return (
      <g fill="#4d403d" opacity=".9">
        <path d="M35 35 42 12l17 23Z" />
        <path d="m70 34 17-22 7 25Z" />
        <ellipse cx="64" cy="70" rx="18" ry="15" />
      </g>
    );
  }
  return (
    <g fill={coat === "charcoal" ? "#a87348" : "#55443a"} opacity=".72">
      <circle cx="48" cy="43" r="5" />
      <circle cx="77" cy="42" r="4" />
      <circle cx="43" cy="67" r="4" />
      <circle cx="83" cy="65" r="5" />
    </g>
  );
}

function CatEquipment({ type, accent }) {
  if (type === "none") return null;
  if (type === "scarf") {
    return (
      <path
        d="M39 89c16 9 34 9 50 0l5 14c-20 9-41 9-60 0Z"
        fill="#8b623c"
        stroke={outline}
        strokeWidth="3"
      />
    );
  }
  if (type === "cossack-harness") {
    return (
      <g>
        <path d="M39 93 83 128H67L31 101Z" fill="#7b3030" stroke={outline} strokeWidth="3" />
        <circle cx="62" cy="111" r="5" fill="#d4a53c" />
      </g>
    );
  }
  if (type === "medic-pouch") {
    return (
      <g>
        <path d="M36 94 93 125" stroke="#405149" strokeWidth="8" />
        <rect
          x="73"
          y="107"
          width="24"
          height="19"
          rx="4"
          fill="#6c3838"
          stroke={outline}
          strokeWidth="2"
        />
        <path d="M85 111v11m-5-5.5h10" stroke="#f4eee4" strokeWidth="2.4" />
      </g>
    );
  }
  if (type === "chest-rig") {
    return (
      <g>
        <path d="M34 99h60l4 29H30Z" fill="#4c513b" stroke={outline} strokeWidth="3" />
        <path d="M47 104v21m17-21v21m17-21v21" stroke="#9b9369" strokeWidth="3" />
      </g>
    );
  }
  return (
    <g>
      <path d="M38 91h52l8 37H30Z" fill="#35463c" stroke={outline} strokeWidth="3" />
      <path d="M51 94v31m27-31v31" stroke="#728169" strokeWidth="3" />
      <path d="M58 105h13v9H58Z" fill={accent} opacity=".9" />
    </g>
  );
}

function CatAccessory({ type }) {
  if (type === "none") return null;
  if (type === "headset") {
    return (
      <g>
        <path
          d="M36 57c0-25 12-37 28-37s29 12 29 37"
          fill="none"
          stroke="#273133"
          strokeWidth="5"
        />
        <rect x="31" y="52" width="10" height="20" rx="4" fill="#435052" />
        <path d="M38 69c8 1 11 6 11 12" fill="none" stroke="#273133" strokeWidth="3" />
      </g>
    );
  }
  if (type === "glasses") {
    return (
      <g fill="none" stroke="#263438" strokeWidth="3">
        <rect x="39" y="50" width="21" height="16" rx="7" />
        <rect x="68" y="50" width="21" height="16" rx="7" />
        <path d="M60 56h8" />
      </g>
    );
  }
  if (type === "goggles") {
    return (
      <path
        d="M37 48h54l-5 21H70l-6-7-6 7H42Z"
        fill="#70a7b1"
        fillOpacity=".65"
        stroke={outline}
        strokeWidth="3"
      />
    );
  }
  if (type === "cap") {
    return (
      <g>
        <path d="M36 38c8-18 48-18 56 0Z" fill="#52654b" stroke={outline} strokeWidth="3" />
        <path d="M64 37h35c-6 8-18 10-35 7Z" fill="#40523d" stroke={outline} strokeWidth="2" />
      </g>
    );
  }
  if (type === "helmet") {
    return (
      <g>
        <path
          d="M31 43c3-23 16-34 34-34 20 0 32 13 34 35Z"
          fill="#53624b"
          stroke={outline}
          strokeWidth="3"
        />
        <path d="M31 42h68" stroke="#29352c" strokeWidth="5" />
      </g>
    );
  }
  if (type === "bandana") {
    return (
      <path
        d="M34 39c19 7 41 7 61 0l-2 12c-19-5-38-5-57 0Z"
        fill="#4d7183"
        stroke={outline}
        strokeWidth="2"
      />
    );
  }
  return <path d="m39 48 48 24M82 45l-8 26" fill="none" stroke="#222a2c" strokeWidth="4" />;
}

export function CustomAvatar({ config, size = 72, className, title = "" }) {
  const value = normalizeCustomAvatar(config);
  const coat = AVATAR_COLORS.coat[value.coatColor];
  const leftEye = AVATAR_COLORS.eyes[value.eyeColor];
  const rightEye = value.eyeColor === "heterochromia" ? "#e4aa37" : leftEye;
  const accent =
    value.gender === "female" ? "#a65f80" : value.gender === "male" ? "#4e7b9c" : "#75834d";
  const folded = value.catType === "scottish-fold";
  const longFur = value.catType === "maine-coon";
  const sphynx = value.catType === "sphynx";

  return (
    <svg
      className={clsx("custom-avatar", className)}
      width={size}
      height={size}
      viewBox="0 0 128 128"
      role={title ? "img" : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : "true"}
    >
      <rect width="128" height="128" rx="24" fill="#1c2927" />
      <CatWeapon type={value.weapon} />
      <path
        d="M27 128c3-27 16-41 37-41s35 14 38 41Z"
        fill={coat}
        stroke={outline}
        strokeWidth="3"
      />
      {longFur ? (
        <path
          d="M37 82 48 103l16-10 17 10 11-21-6 33H42Z"
          fill={coat}
          stroke={outline}
          strokeWidth="2"
        />
      ) : null}
      {folded ? (
        <>
          <path d="M36 36 39 15l18 18Z" fill={coat} stroke={outline} strokeWidth="3" />
          <path d="m73 33 18-18 2 22Z" fill={coat} stroke={outline} strokeWidth="3" />
        </>
      ) : (
        <>
          <path d="M34 39 41 9l22 26Z" fill={coat} stroke={outline} strokeWidth="3" />
          <path d="m66 35 22-26 7 31Z" fill={coat} stroke={outline} strokeWidth="3" />
          <path d="m43 18 4 15-9 3Z" fill="#d58b86" opacity={sphynx ? ".8" : ".55"} />
          <path d="m86 18-4 15 9 3Z" fill="#d58b86" opacity={sphynx ? ".8" : ".55"} />
        </>
      )}
      {longFur ? (
        <path
          d="m39 13-8-7 11 2m45 5 8-7-11 2"
          fill="none"
          stroke={coat}
          strokeWidth="4"
          strokeLinecap="round"
        />
      ) : null}
      <path
        d="M34 45c0-17 12-27 30-27s30 10 30 27v25c0 19-12 30-30 30S34 89 34 70Z"
        fill={coat}
        stroke={outline}
        strokeWidth="3"
      />
      {sphynx ? (
        <path
          d="M41 38c15-8 31-8 46 0M43 45c14-6 28-6 42 0"
          fill="none"
          stroke="#a56f68"
          strokeWidth="1.5"
          opacity=".65"
        />
      ) : null}
      <CatPattern type={value.coatPattern} coat={value.coatColor} />
      <ellipse cx="50" cy="58" rx="7" ry="9" fill="#f4f0df" stroke={outline} strokeWidth="2" />
      <ellipse cx="78" cy="58" rx="7" ry="9" fill="#f4f0df" stroke={outline} strokeWidth="2" />
      <ellipse cx="50" cy="59" rx="3" ry="6" fill={leftEye} />
      <ellipse cx="78" cy="59" rx="3" ry="6" fill={rightEye} />
      <path d="m59 70 5-3 5 3-5 5Z" fill="#b96f72" stroke={outline} strokeWidth="1.5" />
      <path
        d="M64 75c-4 0-7 2-8 5m8-5c4 0 7 2 8 5"
        fill="none"
        stroke={outline}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <g stroke="#d8d1bd" strokeWidth="1.5" opacity=".8">
        <path d="M53 74 27 69M54 78 27 80M75 74l26-5M74 78l27 2" />
      </g>
      <CatEquipment type={value.equipment} accent={accent} />
      <CatAccessory type={value.accessory} />
    </svg>
  );
}
