
import { db } from '../db';
import { placesTable } from '../db/schema';
import { type UpdatePlaceInput, type Place } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updatePlace = async (input: UpdatePlaceInput): Promise<Place> => {
  try {
    // Verify the place exists and belongs to the user
    const existingPlaces = await db.select()
      .from(placesTable)
      .where(and(
        eq(placesTable.id, input.id),
        eq(placesTable.user_id, input.user_id)
      ))
      .execute();

    if (existingPlaces.length === 0) {
      throw new Error('Place not found or access denied');
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.address !== undefined) {
      updateData.address = input.address;
    }
    if (input.google_maps_url !== undefined) {
      updateData.google_maps_url = input.google_maps_url;
    }
    if (input.google_place_id !== undefined) {
      updateData.google_place_id = input.google_place_id;
    }
    if (input.type !== undefined) {
      updateData.type = input.type;
    }
    if (input.city !== undefined) {
      updateData.city = input.city;
    }
    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }
    if (input.is_visited !== undefined) {
      updateData.is_visited = input.is_visited;
    }

    // Update the place
    const result = await db.update(placesTable)
      .set(updateData)
      .where(and(
        eq(placesTable.id, input.id),
        eq(placesTable.user_id, input.user_id)
      ))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Place update failed:', error);
    throw error;
  }
};
