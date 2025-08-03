
import { serial, text, pgTable, timestamp, boolean, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const placeTypeEnum = pgEnum('place_type', [
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
]);

export const vietnameseCityEnum = pgEnum('vietnamese_city', [
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
]);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash'), // Nullable for Google sign-in users
  google_id: text('google_id'), // Nullable for email/password users
  name: text('name').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Places table
export const placesTable = pgTable('places', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  address: text('address').notNull(),
  google_maps_url: text('google_maps_url'), // Nullable
  google_place_id: text('google_place_id'), // Nullable
  type: placeTypeEnum('type').notNull(),
  city: vietnameseCityEnum('city').notNull(),
  notes: text('notes'), // Nullable
  is_visited: boolean('is_visited').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  places: many(placesTable),
}));

export const placesRelations = relations(placesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [placesTable.user_id],
    references: [usersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Place = typeof placesTable.$inferSelect;
export type NewPlace = typeof placesTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = { 
  users: usersTable, 
  places: placesTable 
};
