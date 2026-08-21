export const DEFAULT_CUSTOM_AVATAR = Object.freeze({
  gender: "neutral",
  skin: "sand",
  head: "oval",
  hair: "crop",
  hairColor: "brown",
  facialHair: "none",
  torso: "field-shirt",
  equipment: "vest",
  accessory: "headset",
});

export const AVATAR_CUSTOMIZATION = Object.freeze({
  gender: ["neutral", "woman", "man"],
  skin: ["porcelain", "peach", "sand", "amber", "copper", "umber"],
  head: ["oval", "round", "angular"],
  hair: ["none", "crop", "fade", "side", "bob", "braid", "bun", "forelock"],
  hairColor: ["black", "brown", "auburn", "blond", "silver", "blue"],
  facialHair: ["none", "stubble", "moustache", "goatee", "beard"],
  torso: ["field-shirt", "hoodie", "jacket", "cossack-shirt", "medic-shirt", "flight-suit"],
  equipment: ["none", "vest", "chest-rig", "scarf", "shoulder-strap", "medic-pouch"],
  accessory: ["none", "headset", "glasses", "goggles", "cap", "helmet", "bandana", "earpiece"],
});

export const AVATAR_COLORS = Object.freeze({
  skin: {
    porcelain: "#f8d8ca",
    peach: "#efb394",
    sand: "#d99a73",
    amber: "#bb7650",
    copper: "#925338",
    umber: "#633a2d",
  },
  hair: {
    black: "#20242a",
    brown: "#50372c",
    auburn: "#8f422d",
    blond: "#d8b768",
    silver: "#aeb5b7",
    blue: "#315a72",
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
