
import { db } from '../db';
import { placesTable, usersTable } from '../db/schema';
import { type CreatePlaceInput, type Place } from '../schema';
import { eq } from 'drizzle-orm';

export const createPlace = async (input: CreatePlaceInput): Promise<Place> => {
  try {
    // Verify user exists to prevent foreign key constraint errors
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (existingUser.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Insert place record
    const result = await db.insert(placesTable)
      .values({
        user_id: input.user_id,
        name: input.name,
        address: input.address,
        google_maps_url: input.google_maps_url ?? null,
        google_place_id: input.google_place_id ?? null,
        type: input.type,
        city: input.city,
        notes: input.notes ?? null,
        is_visited: false // Default to unvisited for new places
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Place creation failed:', error);
    throw error;
  }
};
