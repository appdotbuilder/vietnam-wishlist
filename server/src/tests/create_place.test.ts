
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { placesTable, usersTable } from '../db/schema';
import { type CreatePlaceInput } from '../schema';
import { createPlace } from '../handlers/create_place';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  google_id: null,
  name: 'Test User'
};

// Test place input
const testPlaceInput: CreatePlaceInput = {
  user_id: 1, // Will be set after user creation
  name: 'Ben Thanh Market',
  address: 'Lê Lợi, Bến Thành, Quận 1, Thành phố Hồ Chí Minh',
  google_maps_url: 'https://maps.google.com/place/benthanh-market',
  google_place_id: 'ChIJAbCDefGhIjKlMnOpQrStUvWx',
  type: 'market',
  city: 'Ho Chi Minh City',
  notes: 'Famous traditional market with local food and souvenirs'
};

describe('createPlace', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a place with all fields', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const input = { ...testPlaceInput, user_id: userId };

    const result = await createPlace(input);

    // Verify all fields are correctly set
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(userId);
    expect(result.name).toEqual('Ben Thanh Market');
    expect(result.address).toEqual(testPlaceInput.address);
    expect(result.google_maps_url).toEqual('https://maps.google.com/place/benthanh-market');
    expect(result.google_place_id).toEqual('ChIJAbCDefGhIjKlMnOpQrStUvWx');
    expect(result.type).toEqual('market');
    expect(result.city).toEqual('Ho Chi Minh City');
    expect(result.notes).toEqual('Famous traditional market with local food and souvenirs');
    expect(result.is_visited).toEqual(false);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a place with minimal required fields', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const minimalInput: CreatePlaceInput = {
      user_id: userId,
      name: 'Simple Cafe',
      address: '123 Nguyen Hue Street, District 1, Ho Chi Minh City',
      type: 'cafe',
      city: 'Ho Chi Minh City'
    };

    const result = await createPlace(minimalInput);

    expect(result.name).toEqual('Simple Cafe');
    expect(result.address).toEqual(minimalInput.address);
    expect(result.type).toEqual('cafe');
    expect(result.city).toEqual('Ho Chi Minh City');
    expect(result.google_maps_url).toBeNull();
    expect(result.google_place_id).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.is_visited).toEqual(false);
  });

  it('should save place to database correctly', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const input = { ...testPlaceInput, user_id: userId };

    const result = await createPlace(input);

    // Query database to verify place was saved
    const places = await db.select()
      .from(placesTable)
      .where(eq(placesTable.id, result.id))
      .execute();

    expect(places).toHaveLength(1);
    const savedPlace = places[0];
    expect(savedPlace.name).toEqual('Ben Thanh Market');
    expect(savedPlace.user_id).toEqual(userId);
    expect(savedPlace.address).toEqual(testPlaceInput.address);
    expect(savedPlace.type).toEqual('market');
    expect(savedPlace.city).toEqual('Ho Chi Minh City');
    expect(savedPlace.is_visited).toEqual(false);
    expect(savedPlace.created_at).toBeInstanceOf(Date);
  });

  it('should throw error when user does not exist', async () => {
    const input = { ...testPlaceInput, user_id: 999 }; // Non-existent user

    await expect(createPlace(input)).rejects.toThrow(/user.*not found/i);
  });

  it('should handle different place types correctly', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Test restaurant type
    const restaurantInput: CreatePlaceInput = {
      user_id: userId,
      name: 'Pho 24',
      address: '456 Le Loi Street, District 1, Ho Chi Minh City',
      type: 'restaurant',
      city: 'Ho Chi Minh City',
      notes: 'Popular pho chain restaurant'
    };

    const restaurant = await createPlace(restaurantInput);
    expect(restaurant.type).toEqual('restaurant');
    expect(restaurant.notes).toEqual('Popular pho chain restaurant');

    // Test temple type
    const templeInput: CreatePlaceInput = {
      user_id: userId,
      name: 'Jade Emperor Pagoda',
      address: '73 Mai Thi Luu Street, District 1, Ho Chi Minh City',
      type: 'temple',
      city: 'Ho Chi Minh City'
    };

    const temple = await createPlace(templeInput);
    expect(temple.type).toEqual('temple');
    expect(temple.notes).toBeNull();
  });

  it('should handle different Vietnamese cities correctly', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Test Hanoi
    const hanoiInput: CreatePlaceInput = {
      user_id: userId,
      name: 'Hoan Kiem Lake',
      address: 'Hoan Kiem District, Hanoi',
      type: 'park',
      city: 'Hanoi'
    };

    const hanoiPlace = await createPlace(hanoiInput);
    expect(hanoiPlace.city).toEqual('Hanoi');

    // Test Da Nang
    const danangInput: CreatePlaceInput = {
      user_id: userId,
      name: 'Dragon Bridge',
      address: 'Bach Dang Street, Hai Chau District, Da Nang',
      type: 'attraction',
      city: 'Da Nang'
    };

    const danangPlace = await createPlace(danangInput);
    expect(danangPlace.city).toEqual('Da Nang');
  });
});
