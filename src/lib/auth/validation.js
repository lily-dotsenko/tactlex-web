import { z } from "zod";
import { AVATAR_KEYS } from "@/lib/avatars/catalog";
import { AVATAR_CUSTOMIZATION } from "@/lib/avatars/custom";

export const audienceTypes = [
  "military",
  "civilian",
  "cadet",
  "volunteer",
  "other",
  "prefer_not_to_say",
];

const emailSchema = z
  .string()
  .trim()
  .min(3)
  .max(254)
  .email()
  .transform((email) => email.toLocaleLowerCase("en-US"));

const passwordSchema = z
  .string()
  .min(12)
  .max(128)
  .refine((password) => /\S/u.test(password), "Password cannot contain only whitespace.");

const nicknameSchema = z
  .string()
  .trim()
  .min(2)
  .max(32)
  .regex(/^[\p{L}\p{N}][\p{L}\p{N} _.'’ʼ-]*$/u, "Nickname contains unsupported characters.");

export const customAvatarSchema = z
  .object(
    Object.fromEntries(
      Object.entries(AVATAR_CUSTOMIZATION).map(([key, options]) => [key, z.enum(options)]),
    ),
  )
  .strict();

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    nickname: nicknameSchema,
    audienceType: z.enum(audienceTypes).optional(),
    locale: z.enum(["uk", "en"]).default("uk"),
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1).max(128),
  })
  .strict();

export const profileUpdateSchema = z
  .object({
    nickname: nicknameSchema.optional(),
    audienceType: z.enum(audienceTypes).nullable().optional(),
    locale: z.enum(["uk", "en"]).optional(),
    leaderboardVisible: z.boolean().optional(),
    avatarKey: z.enum(AVATAR_KEYS).optional(),
    avatarConfig: customAvatarSchema.optional(),
    dailyGoalXp: z.number().int().min(5).max(500).optional(),
    timezone: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .refine((timezone) => {
        try {
          new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
          return true;
        } catch {
          return false;
        }
      }, "Timezone must be a valid IANA identifier.")
      .optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one profile field is required.",
  });

export function normalizeEmail(email) {
  return emailSchema.parse(email);
}
