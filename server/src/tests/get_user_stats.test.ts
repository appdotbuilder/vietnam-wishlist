
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, placesTable } from '../db/schema';
import { type GetUserStatsInput } from '../schema';
import { getUserStats } from '../handlers/get_user_stats';

describe('getUserStats', () => {
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

  it('should return zero stats for user with no places', async () => {
    const input: GetUserStatsInput = {
      user_id: testUserId
    };

    const result = await getUserStats(input);

    expect(result.total_places).toBe(0);
    expect(result.visited_places).toBe(0);
    expect(result.unvisited_places).toBe(0);
    expect(result.places_by_city).toEqual({});
    expect(result.places_by_type).toEqual({});
  });

  it('should calculate stats correctly for user with multiple places', async () => {
    // Create test places for the user
    await db.insert(placesTable)
      .values([
        {
          user_id: testUserId,
          name: 'Restaurant 1',
          address: 'Address 1',
          type: 'restaurant',
          city: 'Ho Chi Minh City',
          is_visited: true
        },
        {
          user_id: testUserId,
          name: 'Cafe 1',
          address: 'Address 2',
          type: 'cafe',
          city: 'Ho Chi Minh City',
          is_visited: false
        },
        {
          user_id: testUserId,
          name: 'Park 1',
          address: 'Address 3',
          type: 'park',
          city: 'Hanoi',
          is_visited: true
        },
        {
          user_id: testUserId,
          name: 'Restaurant 2',
          address: 'Address 4',
          type: 'restaurant',
          city: 'Da Nang',
          is_visited: false
        }
      ])
      .execute();

    const input: GetUserStatsInput = {
      user_id: testUserId
    };

    const result = await getUserStats(input);

    expect(result.total_places).toBe(4);
    expect(result.visited_places).toBe(2);
    expect(result.unvisited_places).toBe(2);
    
    expect(result.places_by_city).toEqual({
      'Ho Chi Minh City': 2,
      'Hanoi': 1,
      'Da Nang': 1
    });
    
    expect(result.places_by_type).toEqual({
      'restaurant': 2,
      'cafe': 1,
      'park': 1
    });
  });

  it('should only count places for the specified user', async () => {
    // Create places for both users
    await db.insert(placesTable)
      .values([
        {
          user_id: testUserId,
          name: 'User 1 Place',
          address: 'Address 1',
          type: 'restaurant',
          city: 'Ho Chi Minh City',
          is_visited: true
        },
        {
          user_id: otherUserId,
          name: 'User 2 Place',
          address: 'Address 2',
          type: 'cafe',
          city: 'Hanoi',
          is_visited: false
        }
      ])
      .execute();

    const input: GetUserStatsInput = {
      user_id: testUserId
    };

    const result = await getUserStats(input);

    expect(result.total_places).toBe(1);
    expect(result.visited_places).toBe(1);
    expect(result.unvisited_places).toBe(0);
    
    expect(result.places_by_city).toEqual({
      'Ho Chi Minh City': 1
    });
    
    expect(result.places_by_type).toEqual({
      'restaurant': 1
    });
  });

  it('should handle all places being visited', async () => {
    await db.insert(placesTable)
      .values([
        {
          user_id: testUserId,
          name: 'Place 1',
          address: 'Address 1',
          type: 'restaurant',
          city: 'Ho Chi Minh City',
          is_visited: true
        },
        {
          user_id: testUserId,
          name: 'Place 2',
          address: 'Address 2',
          type: 'cafe',
          city: 'Hanoi',
          is_visited: true
        }
      ])
      .execute();

    const input: GetUserStatsInput = {
      user_id: testUserId
    };

    const result = await getUserStats(input);

    expect(result.total_places).toBe(2);
    expect(result.visited_places).toBe(2);
    expect(result.unvisited_places).toBe(0);
  });

  it('should handle all places being unvisited', async () => {
    await db.insert(placesTable)
      .values([
        {
          user_id: testUserId,
          name: 'Place 1',
          address: 'Address 1',
          type: 'restaurant',
          city: 'Ho Chi Minh City',
          is_visited: false
        },
        {
          user_id: testUserId,
          name: 'Place 2',
          address: 'Address 2',
          type: 'cafe',
          city: 'Hanoi',
          is_visited: false
        }
      ])
      .execute();

    const input: GetUserStatsInput = {
      user_id: testUserId
    };

    const result = await getUserStats(input);

    expect(result.total_places).toBe(2);
    expect(result.visited_places).toBe(0);
    expect(result.unvisited_places).toBe(2);
  });
});
