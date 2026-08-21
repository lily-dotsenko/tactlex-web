import clsx from "clsx";
import { AVATAR_COLORS, normalizeCustomAvatar } from "@/lib/avatars/custom";

const torsoColors = {
  "field-shirt": "#53654a",
  hoodie: "#343d42",
  jacket: "#786044",
  "cossack-shirt": "#315f86",
  "medic-shirt": "#586b67",
  "flight-suit": "#4c5f59",
};

function Hair({ style, color }) {
  if (style === "none") return null;
  const common = { fill: color, stroke: "#172026", strokeWidth: 2.4, strokeLinejoin: "round" };
  if (style === "crop")
    return <path d="M39 48c2-19 13-28 25-28 14 0 24 9 27 28-12-8-38-8-52 0Z" {...common} />;
  if (style === "fade")
    return <path d="M42 44c5-17 16-24 29-22 10 1 17 8 20 22-13-6-35-6-49 0Z" {...common} />;
  if (style === "side")
    return <path d="M37 49c3-22 18-31 35-28 13 2 19 13 19 28-10-9-23-15-54 0Z" {...common} />;
  if (style === "bob")
    return (
      <path
        d="M34 56c0-24 12-36 31-36 20 0 31 14 31 39l-9 13-3-27c-12-8-28-8-41 1l-2 26Z"
        {...common}
      />
    );
  if (style === "braid")
    return (
      <>
        <path d="M35 53c1-22 14-33 30-33 19 0 29 13 30 34-13-12-42-14-60-1Z" {...common} />
        <path d="M88 53c9 9 8 27 1 42l-8-5c7-15 7-26 1-33Z" {...common} />
      </>
    );
  if (style === "bun")
    return (
      <>
        <circle cx="83" cy="24" r="12" {...common} />
        <path d="M36 50c2-20 14-30 30-30 18 0 28 12 29 31-14-11-42-12-59-1Z" {...common} />
      </>
    );
  return <path d="M42 44c9-22 25-27 38-20-13 3-18 11-16 23-8-6-14-7-22-3Z" {...common} />;
}

function FacialHair({ style, color }) {
  if (style === "none") return null;
  if (style === "stubble")
    return (
      <path d="M49 70c8 7 23 7 31 0-1 13-8 20-16 20S50 83 49 70Z" fill={color} opacity=".35" />
    );
  if (style === "moustache")
    return <path d="M50 70c5-6 11-4 14 1 3-5 9-7 15-1-6 8-12 7-15 4-4 4-10 4-14-4Z" fill={color} />;
  if (style === "goatee")
    return (
      <>
        <path d="M51 70c5-5 10-3 13 1 4-4 9-6 15-1-6 7-11 6-15 4-4 3-9 3-13-4Z" fill={color} />
        <path d="M57 78h14l-3 16h-8Z" fill={color} />
      </>
    );
  return (
    <path
      d="M43 65c5 8 10 10 21 10s17-3 22-10c0 21-8 32-22 34-14-2-22-13-21-34Z"
      fill={color}
      stroke="#172026"
      strokeWidth="2"
    />
  );
}

function Equipment({ type }) {
  if (type === "none") return null;
  if (type === "vest")
    return <path d="M39 91h50l8 35H31Z" fill="#35463c" stroke="#172026" strokeWidth="3" />;
  if (type === "chest-rig")
    return (
      <>
        <path d="M35 99h58l4 27H31Z" fill="#4c513b" stroke="#172026" strokeWidth="3" />
        <path d="M47 103v20m17-20v20m17-20v20" stroke="#9b9369" strokeWidth="3" />
      </>
    );
  if (type === "scarf")
    return (
      <path
        d="M42 88c13 8 31 8 44 0l5 15c-17 8-37 8-54 0Z"
        fill="#876b43"
        stroke="#172026"
        strokeWidth="2"
      />
    );
  if (type === "shoulder-strap")
    return <path d="M38 91 78 127H64L32 99Z" fill="#2a3132" stroke="#172026" strokeWidth="3" />;
  return (
    <>
      <path d="M37 94 91 126" stroke="#394b42" strokeWidth="8" />
      <rect
        x="72"
        y="107"
        width="23"
        height="18"
        rx="4"
        fill="#6b3030"
        stroke="#172026"
        strokeWidth="2"
      />
      <path d="M83 111v10m-5-5h10" stroke="#eee" strokeWidth="2" />
    </>
  );
}

function Accessory({ type }) {
  if (type === "none") return null;
  if (type === "headset" || type === "earpiece")
    return (
      <>
        <path
          d="M38 57c0-18 10-28 26-28s27 10 27 28"
          fill="none"
          stroke="#232b2d"
          strokeWidth="5"
        />
        <rect x="33" y="54" width="9" height="18" rx="4" fill="#39494a" />
        <path d="M39 69c6 1 8 5 8 10" fill="none" stroke="#232b2d" strokeWidth="3" />
      </>
    );
  if (type === "glasses")
    return (
      <>
        <rect
          x="42"
          y="54"
          width="19"
          height="14"
          rx="6"
          fill="none"
          stroke="#27353b"
          strokeWidth="3"
        />
        <rect
          x="67"
          y="54"
          width="19"
          height="14"
          rx="6"
          fill="none"
          stroke="#27353b"
          strokeWidth="3"
        />
        <path d="M61 59h6" stroke="#27353b" strokeWidth="3" />
      </>
    );
  if (type === "goggles")
    return (
      <path
        d="M40 52h48l-4 18H69l-5-6-5 6H44Z"
        fill="#79a6ad"
        fillOpacity=".65"
        stroke="#202a2c"
        strokeWidth="3"
      />
    );
  if (type === "cap")
    return (
      <>
        <path d="M38 43c4-18 46-18 52 0Z" fill="#52654b" stroke="#172026" strokeWidth="3" />
        <path d="M63 42h34c-4 7-16 10-34 7Z" fill="#40523d" stroke="#172026" strokeWidth="2" />
      </>
    );
  if (type === "helmet")
    return (
      <>
        <path
          d="M34 49c1-22 13-34 31-34 20 0 31 13 32 34Z"
          fill="#52614b"
          stroke="#172026"
          strokeWidth="3"
        />
        <path d="M34 47h63" stroke="#27322a" strokeWidth="5" />
      </>
    );
  return (
    <path
      d="M35 43c18 8 39 8 59 0l-1 10c-19-6-38-6-57 0Z"
      fill="#506f80"
      stroke="#172026"
      strokeWidth="2"
    />
  );
}

export function CustomAvatar({ config, size = 72, className, title = "" }) {
  const value = normalizeCustomAvatar(config);
  const skin = AVATAR_COLORS.skin[value.skin];
  const hair = AVATAR_COLORS.hair[value.hairColor];
  const headPath =
    value.head === "round"
      ? "M38 51c0-20 11-31 27-31s27 11 27 31v18c0 18-11 29-27 29S38 87 38 69Z"
      : value.head === "angular"
        ? "M39 48 48 27l17-8 18 8 8 22-5 34-21 17-21-16Z"
        : "M38 49c0-20 11-30 27-30s27 10 27 30v20c0 19-11 31-27 31S38 88 38 69Z";
  const torsoWidth = value.gender === "woman" ? 27 : value.gender === "man" ? 35 : 31;
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
      <path
        d={`M${64 - torsoWidth} 128c2-25 12-38 ${torsoWidth}c${torsoWidth - 12} 0 ${torsoWidth - 2} 13 ${torsoWidth} 38Z`}
        fill={torsoColors[value.torso]}
        stroke="#172026"
        strokeWidth="3"
      />
      <path d="M55 85h19v16H55Z" fill={skin} />
      <circle cx="36" cy="61" r="9" fill={skin} stroke="#172026" strokeWidth="2" />
      <circle cx="94" cy="61" r="9" fill={skin} stroke="#172026" strokeWidth="2" />
      <path d={headPath} fill={skin} stroke="#172026" strokeWidth="3" />
      <Hair style={value.hair} color={hair} />
      <path d="M49 58h10m11 0h10" stroke="#172026" strokeWidth="3" strokeLinecap="round" />
      <circle cx="54" cy="62" r="2" fill="#172026" />
      <circle cx="76" cy="62" r="2" fill="#172026" />
      <path d="M64 62v8l4 2" fill="none" stroke="#9b604b" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M58 80c4 3 9 3 13 0"
        fill="none"
        stroke="#8d4b47"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <FacialHair style={value.facialHair} color={hair} />
      <Equipment type={value.equipment} />
      <Accessory type={value.accessory} />
    </svg>
  );
}
