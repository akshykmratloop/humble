const { z } = require('zod');

const MIN_AGE_YEARS = 18;

function isAtLeastAge(birthdate, years) {
  const today = new Date();
  const cutoff = new Date(today.getFullYear() - years, today.getMonth(), today.getDate());
  return birthdate <= cutoff;
}

/** Sanitization: trim -> strip control chars. HTML stripping happens at the persistence
 * boundary (server) since it depends on the target field's allowed rich-text policy (none, for MVP). */
const trimmed = (schema) => schema.transform((v) => (typeof v === 'string' ? v.trim() : v));

const emailSchema = trimmed(z.string().min(5).max(254).email()).transform((v) => v.toLowerCase());

const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128)
  .refine((v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), {
    message: 'Password must contain at least one letter and one number',
  });

const nameSchema = trimmed(z.string().min(1).max(80));

const bioSchema = trimmed(z.string().max(500)).optional();

const messageBodySchema = trimmed(z.string().min(1).max(4000));

const birthdateSchema = z.coerce
  .date()
  .refine((d) => isAtLeastAge(d, MIN_AGE_YEARS), { message: 'You must be at least 18 years old' });

const genderEnum = z.enum(['MAN', 'WOMAN', 'NONBINARY', 'OTHER']);
const genderPreferenceEnum = z.enum(['MAN', 'WOMAN', 'NONBINARY', 'OTHER', 'ANY']);

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  birthdate: birthdateSchema,
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

const passwordResetRequestSchema = z.object({ email: emailSchema });

const passwordResetConfirmSchema = z.object({
  token: z.string().min(1),
  newPassword: passwordSchema,
});

const profileUpdateSchema = z.object({
  name: nameSchema.optional(),
  gender: genderEnum.optional(),
  bio: bioSchema,
  cityLabel: trimmed(z.string().max(120)).optional(),
});

const preferenceUpdateSchema = z.object({
  genderPreference: z.array(genderPreferenceEnum).min(1).optional(),
  ageMin: z.coerce.number().int().min(18).max(99).optional(),
  ageMax: z.coerce.number().int().min(18).max(99).optional(),
  maxDistanceKm: z.coerce.number().int().min(1).max(500).optional(),
  humbleMatchOptOut: z.boolean().optional(),
});

const decisionSchema = z.object({
  targetId: z.string().uuid(),
  decision: z.enum(['LIKE', 'REJECT']),
});

const blockSchema = z.object({
  userId: z.string().uuid(),
});

const reportCategoryEnum = z.enum([
  'HARASSMENT',
  'FAKE_PROFILE',
  'INAPPROPRIATE_CONTENT',
  'SPAM',
  'SAFETY_CONCERN',
  'OTHER',
]);

const reportSchema = z.object({
  userId: z.string().uuid(),
  category: reportCategoryEnum,
  details: trimmed(z.string().max(2000)).optional(),
});

const sendMessageSchema = z.object({
  body: messageBodySchema,
});

const reorderPhotosSchema = z.object({
  orderedPhotoIds: z.array(z.string().uuid()).min(1).max(6),
});

const paginationQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

module.exports = {
  MIN_AGE_YEARS,
  isAtLeastAge,
  emailSchema,
  passwordSchema,
  nameSchema,
  bioSchema,
  messageBodySchema,
  birthdateSchema,
  genderEnum,
  genderPreferenceEnum,
  reportCategoryEnum,
  registerSchema,
  loginSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  profileUpdateSchema,
  preferenceUpdateSchema,
  decisionSchema,
  blockSchema,
  reportSchema,
  sendMessageSchema,
  paginationQuerySchema,
  reorderPhotosSchema,
};
