
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, placesTable } from '../db/schema';
import { type GetUserPlacesInput } from '../schema';
import { getUserPlaces } from '../handlers/get_user_places';
import { eq } from 'drizzle-orm';

describe('getUserPlaces', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
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
  });

  // Helper function to create places directly
  const createPlace = async (placeData: {
    user_id: number;
    name: string;
    address: string;
    type: 'restaurant' | 'cafe' | 'park' | 'museum' | 'beach' | 'temple' | 'market' | 'shopping_mall' | 'hotel' | 'attraction' | 'bar' | 'nightlife' | 'entertainment' | 'cultural_site' | 'nature' | 'other';
    city: 'Ho Chi Minh City' | 'Hanoi' | 'Da Nang' | 'Hai Phong' | 'Can Tho' | 'Bien Hoa' | 'Hue' | 'Nha Trang' | 'Buon Ma Thuot' | 'Quy Nhon' | 'Vung Tau' | 'Nam Dinh' | 'Phan Thiet' | 'Long Xuyen' | 'Thai Nguyen' | 'Thanh Hoa' | 'Rach Gia' | 'Cam Ranh' | 'Vinh Long' | 'My Tho';
    google_maps_url?: string | null;
    google_place_id?: string | null;
    notes?: string | null;
  }) => {
    const result = await db.insert(placesTable)
      .values({
        user_id: placeData.user_id,
        name: placeData.name,
        address: placeData.address,
        type: placeData.type,
        city: placeData.city,
        google_maps_url: placeData.google_maps_url ?? null,
        google_place_id: placeData.google_place_id ?? null,
        notes: placeData.notes ?? null
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should return empty array when user has no places', async () => {
    const input: GetUserPlacesInput = {
      user_id: testUserId
    };

    const result = await getUserPlaces(input);
    expect(result).toEqual([]);
  });

  it('should return all places for a user', async () => {
    // Create test places
    await createPlace({
      user_id: testUserId,
      name: 'Pho 24',
      address: '123 Nguyen Hue, District 1',
      type: 'restaurant',
      city: 'Ho Chi Minh City'
    });

    await createPlace({
      user_id: testUserId,
      name: 'Independence Palace',
      address: '135 Nam Ky Khoi Nghia, District 1',
      type: 'attraction',
      city: 'Ho Chi Minh City'
    });

    // Create place for other user (should not be returned)
    await createPlace({
      user_id: otherUserId,
      name: 'Other Place',
      address: '456 Other Street',
      type: 'cafe',
      city: 'Hanoi'
    });

    const input: GetUserPlacesInput = {
      user_id: testUserId
    };

    const result = await getUserPlaces(input);
    
    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('Pho 24');
    expect(result[0].user_id).toEqual(testUserId);
    expect(result[1].name).toEqual('Independence Palace');
    expect(result[1].user_id).toEqual(testUserId);
  });

  it('should filter places by city', async () => {
    // Create places in different cities
    await createPlace({
      user_id: testUserId,
      name: 'Ben Thanh Market',
      address: 'Le Loi, District 1',
      type: 'market',
      city: 'Ho Chi Minh City'
    });

    await createPlace({
      user_id: testUserId,
      name: 'Hoan Kiem Lake',
      address: 'Hoan Kiem District',
      type: 'park',
      city: 'Hanoi'
    });

    const input: GetUserPlacesInput = {
      user_id: testUserId,
      city: 'Ho Chi Minh City'
    };

    const result = await getUserPlaces(input);
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Ben Thanh Market');
    expect(result[0].city).toEqual('Ho Chi Minh City');
  });

  it('should filter places by type', async () => {
    // Create places of different types
    await createPlace({
      user_id: testUserId,
      name: 'Quan An Ngon',
      address: '18 Phan Boi Chau',
      type: 'restaurant',
      city: 'Ho Chi Minh City'
    });

    await createPlace({
      user_id: testUserId,
      name: 'Highlands Coffee',
      address: '234 Dong Khoi',
      type: 'cafe',
      city: 'Ho Chi Minh City'
    });

    const input: GetUserPlacesInput = {
      user_id: testUserId,
      type: 'restaurant'
    };

    const result = await getUserPlaces(input);
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Quan An Ngon');
    expect(result[0].type).toEqual('restaurant');
  });

  it('should filter places by visited status', async () => {
    // Create visited and unvisited places
    const visitedPlace = await createPlace({
      user_id: testUserId,
      name: 'War Remnants Museum',
      address: '28 Vo Van Tan',
      type: 'museum',
      city: 'Ho Chi Minh City'
    });

    await createPlace({
      user_id: testUserId,
      name: 'Cu Chi Tunnels',
      address: 'Cu Chi District',
      type: 'attraction',
      city: 'Ho Chi Minh City'
    });

    // Mark one place as visited
    await db.update(placesTable)
      .set({ is_visited: true })
      .where(eq(placesTable.id, visitedPlace.id))
      .execute();

    const input: GetUserPlacesInput = {
      user_id: testUserId,
      is_visited: true
    };

    const result = await getUserPlaces(input);
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('War Remnants Museum');
    expect(result[0].is_visited).toEqual(true);
  });

  it('should combine multiple filters', async () => {
    // Create places with different combinations
    const targetPlace = await createPlace({
      user_id: testUserId,
      name: 'Dong Xuan Market',
      address: 'Dong Xuan, Hoan Kiem',
      type: 'market',
      city: 'Hanoi'
    });

    await createPlace({
      user_id: testUserId,
      name: 'Ben Thanh Market',
      address: 'Le Loi, District 1',
      type: 'market',
      city: 'Ho Chi Minh City'
    });

    await createPlace({
      user_id: testUserId,
      name: 'Hanoi Cafe',
      address: 'Old Quarter',
      type: 'cafe',
      city: 'Hanoi'
    });

    // Mark target place as visited
    await db.update(placesTable)
      .set({ is_visited: true })
      .where(eq(placesTable.id, targetPlace.id))
      .execute();

    const input: GetUserPlacesInput = {
      user_id: testUserId,
      city: 'Hanoi',
      type: 'market',
      is_visited: true
    };

    const result = await getUserPlaces(input);
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Dong Xuan Market');
    expect(result[0].city).toEqual('Hanoi');
    expect(result[0].type).toEqual('market');
    expect(result[0].is_visited).toEqual(true);
  });

  it('should return empty array when no places match filters', async () => {
    // Create a place that won't match our filter
    await createPlace({
      user_id: testUserId,
      name: 'Some Place',
      address: '123 Street',
      type: 'restaurant',
      city: 'Ho Chi Minh City'
    });

    const input: GetUserPlacesInput = {
      user_id: testUserId,
      city: 'Hanoi' // Different city
    };

    const result = await getUserPlaces(input);
    expect(result).toEqual([]);
  });
});
