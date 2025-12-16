import { z } from 'zod';

export const userRoleSchema = z.enum(['admin', 'manager', 'bartender']);

export const userProfileSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1, 'Имя пользователя обязательно'),
  email: z.string().email('Некорректный email'),
  role: userRoleSchema,
  createdAt: z.any(), // Firestore Timestamp
  city: z.string().optional(),
  establishment: z.string().optional(),
  phone: z.string().optional(),
  socialLink: z.string().url().optional().or(z.literal('')),
  isBanned: z.boolean().optional(),
});

export type UserProfileInput = z.input<typeof userProfileSchema>;
export type UserProfileOutput = z.output<typeof userProfileSchema>;

