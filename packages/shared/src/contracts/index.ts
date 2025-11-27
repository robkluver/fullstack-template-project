import { z } from 'zod';

// Auth contracts
export const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
  }),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

// OAuth 2.0 contracts
export const TokenRequestSchema = z.discriminatedUnion('grant_type', [
  // Authorization code grant (with PKCE)
  z.object({
    grant_type: z.literal('authorization_code'),
    code: z.string().min(1),
    code_verifier: z.string().min(43).max(128),
    redirect_uri: z.string().url().optional(),
  }),
  // Refresh token grant
  z.object({
    grant_type: z.literal('refresh_token'),
    refresh_token: z.string().min(1),
  }),
  // Password grant (for testing/dev only)
  z.object({
    grant_type: z.literal('password'),
    username: z.string().email(),
    password: z.string().min(8),
  }),
]);

export type TokenRequest = z.infer<typeof TokenRequestSchema>;

export const RevokeRequestSchema = z.object({
  token: z.string().min(1),
  token_type_hint: z.enum(['access_token', 'refresh_token']).optional(),
});

export type RevokeRequest = z.infer<typeof RevokeRequestSchema>;

export const UserRegistrationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
});

export type UserRegistration = z.infer<typeof UserRegistrationSchema>;
