
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, placesTable } from '../db/schema';
import { type UpdatePlaceInput } from '../schema';
import { updatePlace } from '../handlers/update_place';
import { eq } from 'drizzle-orm';

describe('updatePlace', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testPlaceId: number;
  let otherUserId: number;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'test@example.com',
          password_hash: 'hashed_password',
          name: 'Test User'
        },
        {
          email: 'other@example.com',
          password_hash: 'hashed_password',
          name: 'Other User'
        }
      ])
      .returning()
      .execute();

    testUserId = users[0].id;
    otherUserId = users[1].id;

    // Create test place
    const places = await db.insert(placesTable)
      .values({
        user_id: testUserId,
        name: 'Original Place',
        address: 'Original Address',
        type: 'restaurant',
        city: 'Ho Chi Minh City',
        notes: 'Original notes',
        is_visited: false
      })
      .returning()
      .execute();

    testPlaceId = places[0].id;
  });

  it('should update place with all fields', async () => {
    const input: UpdatePlaceInput = {
      id: testPlaceId,
      user_id: testUserId,
      name: 'Updated Place',
      address: 'Updated Address',
      google_maps_url: 'https://maps.google.com/updated',
      google_place_id: 'updated_place_id',
      type: 'cafe',
      city: 'Hanoi',
      notes: 'Updated notes',
      is_visited: true
    };

    const result = await updatePlace(input);

    expect(result.id).toEqual(testPlaceId);
    expect(result.user_id).toEqual(testUserId);
    expect(result.name).toEqual('Updated Place');
    expect(result.address).toEqual('Updated Address');
    expect(result.google_maps_url).toEqual('https://maps.google.com/updated');
    expect(result.google_place_id).toEqual('updated_place_id');
    expect(result.type).toEqual('cafe');
    expect(result.city).toEqual('Hanoi');
    expect(result.notes).toEqual('Updated notes');
    expect(result.is_visited).toEqual(true);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update place with partial fields', async () => {
    const input: UpdatePlaceInput = {
      id: testPlaceId,
      user_id: testUserId,
      name: 'Partially Updated Place',
      is_visited: true
    };

    const result = await updatePlace(input);

    expect(result.name).toEqual('Partially Updated Place');
    expect(result.is_visited).toEqual(true);
    // Other fields should remain unchanged
    expect(result.address).toEqual('Original Address');
    expect(result.type).toEqual('restaurant');
    expect(result.city).toEqual('Ho Chi Minh City');
    expect(result.notes).toEqual('Original notes');
  });

  it('should update place in database', async () => {
    const input: UpdatePlaceInput = {
      id: testPlaceId,
      user_id: testUserId,
      name: 'Database Updated Place',
      type: 'museum'
    };

    await updatePlace(input);

    const places = await db.select()
      .from(placesTable)
      .where(eq(placesTable.id, testPlaceId))
      .execute();

    expect(places).toHaveLength(1);
    expect(places[0].name).toEqual('Database Updated Place');
    expect(places[0].type).toEqual('museum');
    expect(places[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle nullable fields correctly', async () => {
    const input: UpdatePlaceInput = {
      id: testPlaceId,
      user_id: testUserId,
      google_maps_url: null,
      google_place_id: null,
      notes: null
    };

    const result = await updatePlace(input);

    expect(result.google_maps_url).toBeNull();
    expect(result.google_place_id).toBeNull();
    expect(result.notes).toBeNull();
  });

  it('should throw error when place does not exist', async () => {
    const input: UpdatePlaceInput = {
      id: 99999,
      user_id: testUserId,
      name: 'Non-existent Place'
    };

    expect(updatePlace(input)).rejects.toThrow(/place not found/i);
  });

  it('should throw error when user does not own the place', async () => {
    const input: UpdatePlaceInput = {
      id: testPlaceId,
      user_id: otherUserId,
      name: 'Unauthorized Update'
    };

    expect(updatePlace(input)).rejects.toThrow(/place not found|access denied/i);
  });

  it('should update timestamps correctly', async () => {
    const beforeUpdate = new Date();
    
    const input: UpdatePlaceInput = {
      id: testPlaceId,
      user_id: testUserId,
      name: 'Timestamp Test'
    };

    const result = await updatePlace(input);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBeLessThan(result.updated_at.getTime());
  });
});
