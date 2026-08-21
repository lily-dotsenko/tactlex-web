export const DEFAULT_CUSTOM_AVATAR = Object.freeze({
  catType: "shorthair",
  gender: "neutral",
  coatColor: "ginger",
  coatPattern: "tabby",
  eyeColor: "green",
  equipment: "tactical-vest",
  weapon: "none",
  accessory: "headset",
});

export const AVATAR_CUSTOMIZATION = Object.freeze({
  catType: ["shorthair", "maine-coon", "siamese", "bengal", "scottish-fold", "sphynx"],
  gender: ["neutral", "female", "male"],
  coatColor: ["ginger", "charcoal", "snow", "smoke", "brown", "cream"],
  coatPattern: ["solid", "tabby", "tuxedo", "calico", "point", "spotted"],
  eyeColor: ["green", "amber", "blue", "copper", "heterochromia"],
  equipment: ["none", "tactical-vest", "chest-rig", "medic-pouch", "scarf", "cossack-harness"],
  weapon: ["none", "carbine", "marksman-rifle", "bow", "sabre"],
  accessory: ["none", "headset", "glasses", "goggles", "cap", "helmet", "bandana", "eyepatch"],
});

export const AVATAR_COLORS = Object.freeze({
  coat: {
    ginger: "#c97835",
    charcoal: "#30363a",
    snow: "#ece8df",
    smoke: "#858e91",
    brown: "#76503b",
    cream: "#d8bd8c",
  },
  eyes: {
    green: "#72bf68",
    amber: "#e4aa37",
    blue: "#67b7df",
    copper: "#c9773d",
    heterochromia: "#67b7df",
  },
});

export function normalizeCustomAvatar(value) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.fromEntries(
    Object.entries(AVATAR_CUSTOMIZATION).map(([key, options]) => [
      key,
      options.includes(input[key]) ? input[key] : DEFAULT_CUSTOM_AVATAR[key],
    ]),
  );
}
