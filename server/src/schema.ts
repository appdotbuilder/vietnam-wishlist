
import { z } from 'zod';

// Vietnamese cities enum (major cities)
export const vietnameseCities = [
  'Ho Chi Minh City',
  'Hanoi',
  'Da Nang',
  'Hai Phong',
  'Can Tho',
  'Bien Hoa',
  'Hue',
  'Nha Trang',
  'Buon Ma Thuot',
  'Quy Nhon',
  'Vung Tau',
  'Nam Dinh',
  'Phan Thiet',
  'Long Xuyen',
  'Thai Nguyen',
  'Thanh Hoa',
  'Rach Gia',
  'Cam Ranh',
  'Vinh Long',
  'My Tho'
] as const;

// Place types enum
export const placeTypes = [
  'restaurant',
  'cafe',
  'park',
  'museum',
  'beach',
  'temple',
  'market',
  'shopping_mall',
  'hotel',
  'attraction',
  'bar',
  'nightlife',
  'entertainment',
  'cultural_site',
  'nature',
  'other'
] as const;

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string().nullable(),
  google_id: z.string().nullable(),
  name: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Place schema
export const placeSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  name: z.string(),
  address: z.string(),
  google_maps_url: z.string().nullable(),
  google_place_id: z.string().nullable(),
  type: z.enum(placeTypes),
  city: z.enum(vietnameseCities),
  notes: z.string().nullable(),
  is_visited: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Place = z.infer<typeof placeSchema>;

// Auth schemas
export const registerInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100)
});

export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const googleAuthInputSchema = z.object({
  google_id: z.string(),
  email: z.string().email(),
  name: z.string()
});

export type GoogleAuthInput = z.infer<typeof googleAuthInputSchema>;

// Place input schemas
export const createPlaceInputSchema = z.object({
  user_id: z.number(),
  name: z.string().min(1).max(200),
  address: z.string().min(1).max(500),
  google_maps_url: z.string().url().nullable().optional(),
  google_place_id: z.string().nullable().optional(),
  type: z.enum(placeTypes),
  city: z.enum(vietnameseCities),
  notes: z.string().max(1000).nullable().optional()
});

export type CreatePlaceInput = z.infer<typeof createPlaceInputSchema>;

export const updatePlaceInputSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  name: z.string().min(1).max(200).optional(),
  address: z.string().min(1).max(500).optional(),
  google_maps_url: z.string().url().nullable().optional(),
  google_place_id: z.string().nullable().optional(),
  type: z.enum(placeTypes).optional(),
  city: z.enum(vietnameseCities).optional(),
  notes: z.string().max(1000).nullable().optional(),
  is_visited: z.boolean().optional()
});

export type UpdatePlaceInput = z.infer<typeof updatePlaceInputSchema>;

export const getUserPlacesInputSchema = z.object({
  user_id: z.number(),
  city: z.enum(vietnameseCities).optional(),
  type: z.enum(placeTypes).optional(),
  is_visited: z.boolean().optional()
});

export type GetUserPlacesInput = z.infer<typeof getUserPlacesInputSchema>;

// Statistics schemas
export const placeStatsSchema = z.object({
  total_places: z.number(),
  visited_places: z.number(),
  unvisited_places: z.number(),
  places_by_city: z.record(z.string(), z.number()),
  places_by_type: z.record(z.string(), z.number())
});

export type PlaceStats = z.infer<typeof placeStatsSchema>;

export const getUserStatsInputSchema = z.object({
  user_id: z.number()
});

export type GetUserStatsInput = z.infer<typeof getUserStatsInputSchema>;
