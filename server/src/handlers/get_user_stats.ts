
import { db } from '../db';
import { placesTable } from '../db/schema';
import { eq, count, and } from 'drizzle-orm';
import { type GetUserStatsInput, type PlaceStats } from '../schema';

export async function getUserStats(input: GetUserStatsInput): Promise<PlaceStats> {
  try {
    // Get all places for the user
    const userPlaces = await db.select()
      .from(placesTable)
      .where(eq(placesTable.user_id, input.user_id))
      .execute();

    // Calculate basic stats
    const totalPlaces = userPlaces.length;
    const visitedPlaces = userPlaces.filter(place => place.is_visited).length;
    const unvisitedPlaces = totalPlaces - visitedPlaces;

    // Group places by city
    const placesByCity: Record<string, number> = {};
    for (const place of userPlaces) {
      placesByCity[place.city] = (placesByCity[place.city] || 0) + 1;
    }

    // Group places by type
    const placesByType: Record<string, number> = {};
    for (const place of userPlaces) {
      placesByType[place.type] = (placesByType[place.type] || 0) + 1;
    }

    return {
      total_places: totalPlaces,
      visited_places: visitedPlaces,
      unvisited_places: unvisitedPlaces,
      places_by_city: placesByCity,
      places_by_type: placesByType
    };
  } catch (error) {
    console.error('Get user stats failed:', error);
    throw error;
  }
}
