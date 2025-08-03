
import { db } from '../db';
import { placesTable } from '../db/schema';
import { type GetUserPlacesInput, type Place } from '../schema';
import { eq, and, type SQL } from 'drizzle-orm';

export async function getUserPlaces(input: GetUserPlacesInput): Promise<Place[]> {
  try {
    // Start with base query
    let query = db.select().from(placesTable);

    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    // Always filter by user_id
    conditions.push(eq(placesTable.user_id, input.user_id));

    // Apply optional filters
    if (input.city !== undefined) {
      conditions.push(eq(placesTable.city, input.city));
    }

    if (input.type !== undefined) {
      conditions.push(eq(placesTable.type, input.type));
    }

    if (input.is_visited !== undefined) {
      conditions.push(eq(placesTable.is_visited, input.is_visited));
    }

    // Apply where clause - don't reassign the query variable
    const finalQuery = query.where(conditions.length === 1 ? conditions[0] : and(...conditions));

    // Execute query
    const results = await finalQuery.execute();

    // Return results as-is since there are no numeric fields to convert
    return results;
  } catch (error) {
    console.error('Failed to get user places:', error);
    throw error;
  }
}
