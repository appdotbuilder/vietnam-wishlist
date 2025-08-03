
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type GoogleAuthInput } from '../schema';
import { googleAuth } from '../handlers/google_auth';
import { eq } from 'drizzle-orm';

// Test input
const testGoogleInput: GoogleAuthInput = {
  google_id: 'google_123456789',
  email: 'test@gmail.com',
  name: 'Test User'
};

describe('googleAuth', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create new user when user does not exist', async () => {
    const result = await googleAuth(testGoogleInput);

    // Basic field validation
    expect(result.email).toEqual('test@gmail.com');
    expect(result.google_id).toEqual('google_123456789');
    expect(result.name).toEqual('Test User');
    expect(result.password_hash).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save new user to database', async () => {
    const result = await googleAuth(testGoogleInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@gmail.com');
    expect(users[0].google_id).toEqual('google_123456789');
    expect(users[0].name).toEqual('Test User');
    expect(users[0].password_hash).toBeNull();
  });

  it('should return existing user when found by google_id', async () => {
    // Create existing user
    const existingUsers = await db.insert(usersTable)
      .values({
        email: 'test@gmail.com',
        google_id: 'google_123456789',
        name: 'Original Name',
        password_hash: null
      })
      .returning()
      .execute();

    const existingUser = existingUsers[0];

    // Authenticate with same google_id but different name
    const result = await googleAuth({
      google_id: 'google_123456789',
      email: 'test@gmail.com',
      name: 'Updated Name'
    });

    // Should update name and return existing user
    expect(result.id).toEqual(existingUser.id);
    expect(result.google_id).toEqual('google_123456789');
    expect(result.name).toEqual('Updated Name'); // Should be updated
    expect(result.email).toEqual('test@gmail.com');
  });

  it('should return existing user when found by email', async () => {
    // Create existing user without google_id
    const existingUsers = await db.insert(usersTable)
      .values({
        email: 'test@gmail.com',
        google_id: null,
        name: 'Original Name',
        password_hash: 'some_hash'
      })
      .returning()
      .execute();

    const existingUser = existingUsers[0];

    // Authenticate with Google
    const result = await googleAuth(testGoogleInput);

    // Should update with Google info and return existing user
    expect(result.id).toEqual(existingUser.id);
    expect(result.google_id).toEqual('google_123456789'); // Should be added
    expect(result.name).toEqual('Test User'); // Should be updated
    expect(result.email).toEqual('test@gmail.com');
    expect(result.password_hash).toEqual('some_hash'); // Should remain unchanged
  });

  it('should update existing user fields when needed', async () => {
    // Create existing user with different name
    const existingUsers = await db.insert(usersTable)
      .values({
        email: 'test@gmail.com',
        google_id: 'google_123456789',
        name: 'Old Name',
        password_hash: null
      })
      .returning()
      .execute();

    const existingUser = existingUsers[0];
    const originalUpdatedAt = existingUser.updated_at;

    // Wait a moment to ensure updated_at changes
    await new Promise(resolve => setTimeout(resolve, 10));

    // Authenticate with updated name
    const result = await googleAuth({
      google_id: 'google_123456789',
      email: 'test@gmail.com',
      name: 'New Name'
    });

    // Should update name and updated_at
    expect(result.id).toEqual(existingUser.id);
    expect(result.name).toEqual('New Name');
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should not update when no changes needed', async () => {
    // Create existing user with same data
    const existingUsers = await db.insert(usersTable)
      .values({
        email: 'test@gmail.com',
        google_id: 'google_123456789',
        name: 'Test User',
        password_hash: null
      })
      .returning()
      .execute();

    const existingUser = existingUsers[0];
    const originalUpdatedAt = existingUser.updated_at;

    // Authenticate with same data
    const result = await googleAuth(testGoogleInput);

    // Should return existing user without updates
    expect(result.id).toEqual(existingUser.id);
    expect(result.name).toEqual('Test User');
    expect(result.updated_at.getTime()).toEqual(originalUpdatedAt.getTime());
  });
});
