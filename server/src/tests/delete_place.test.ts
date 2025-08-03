
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, placesTable } from '../db/schema';
import { type DeletePlaceInput } from '../handlers/delete_place';
import { deletePlace } from '../handlers/delete_place';
import { eq } from 'drizzle-orm';

describe('deletePlace', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a place that belongs to the user', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create a test place
    const placeResult = await db.insert(placesTable)
      .values({
        user_id: userId,
        name: 'Test Place',
        address: '123 Test Street',
        type: 'restaurant',
        city: 'Ho Chi Minh City'
      })
      .returning()
      .execute();
    const placeId = placeResult[0].id;

    const input: DeletePlaceInput = {
      id: placeId,
      user_id: userId
    };

    const result = await deletePlace(input);

    expect(result.success).toBe(true);

    // Verify place was deleted from database
    const places = await db.select()
      .from(placesTable)
      .where(eq(placesTable.id, placeId))
      .execute();

    expect(places).toHaveLength(0);
  });

  it('should return false when place does not exist', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const input: DeletePlaceInput = {
      id: 99999, // Non-existent place ID
      user_id: userId
    };

    const result = await deletePlace(input);

    expect(result.success).toBe(false);
  });

  it('should return false when place belongs to different user', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashedpassword',
        name: 'User One'
      })
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashedpassword',
        name: 'User Two'
      })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Create place belonging to user1
    const placeResult = await db.insert(placesTable)
      .values({
        user_id: user1Id,
        name: 'User One Place',
        address: '123 User One Street',
        type: 'cafe',
        city: 'Hanoi'
      })
      .returning()
      .execute();
    const placeId = placeResult[0].id;

    // Try to delete with user2's ID
    const input: DeletePlaceInput = {
      id: placeId,
      user_id: user2Id
    };

    const result = await deletePlace(input);

    expect(result.success).toBe(false);

    // Verify place still exists in database
    const places = await db.select()
      .from(placesTable)
      .where(eq(placesTable.id, placeId))
      .execute();

    expect(places).toHaveLength(1);
    expect(places[0].user_id).toBe(user1Id);
  });

  it('should not affect other places when deleting', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create two test places
    const place1Result = await db.insert(placesTable)
      .values({
        user_id: userId,
        name: 'Place One',
        address: '123 Street One',
        type: 'restaurant',
        city: 'Ho Chi Minh City'
      })
      .returning()
      .execute();
    const place1Id = place1Result[0].id;

    const place2Result = await db.insert(placesTable)
      .values({
        user_id: userId,
        name: 'Place Two',
        address: '456 Street Two',
        type: 'cafe',
        city: 'Da Nang'
      })
      .returning()
      .execute();
    const place2Id = place2Result[0].id;

    // Delete place1
    const input: DeletePlaceInput = {
      id: place1Id,
      user_id: userId
    };

    const result = await deletePlace(input);

    expect(result.success).toBe(true);

    // Verify place1 was deleted
    const deletedPlace = await db.select()
      .from(placesTable)
      .where(eq(placesTable.id, place1Id))
      .execute();

    expect(deletedPlace).toHaveLength(0);

    // Verify place2 still exists
    const remainingPlace = await db.select()
      .from(placesTable)
      .where(eq(placesTable.id, place2Id))
      .execute();

    expect(remainingPlace).toHaveLength(1);
    expect(remainingPlace[0].name).toBe('Place Two');
  });
});
