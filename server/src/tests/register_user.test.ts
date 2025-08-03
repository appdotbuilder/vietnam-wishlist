
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterInput } from '../schema';
import { registerUser } from '../handlers/register_user';
import { eq } from 'drizzle-orm';

// Test input
const testInput: RegisterInput = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User'
};

describe('registerUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a new user', async () => {
    const result = await registerUser(testInput);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.name).toEqual('Test User');
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('password123'); // Should be hashed
    expect(result.google_id).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await registerUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].name).toEqual('Test User');
    expect(users[0].password_hash).toBeDefined();
    expect(users[0].google_id).toBeNull();
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should hash the password', async () => {
    const result = await registerUser(testInput);

    // Password should be hashed, not plain text
    expect(result.password_hash).not.toEqual('password123');
    expect(result.password_hash).toBeDefined();
    expect(typeof result.password_hash).toBe('string');
    expect(result.password_hash!.length).toBeGreaterThan(10);

    // Verify password can be verified with Bun's password verification
    const isValid = await Bun.password.verify('password123', result.password_hash!);
    expect(isValid).toBe(true);
  });

  it('should throw error if email already exists', async () => {
    // Create first user
    await registerUser(testInput);

    // Try to create another user with same email
    await expect(registerUser(testInput))
      .rejects.toThrow(/already exists/i);
  });

  it('should create users with different emails successfully', async () => {
    const firstUser = await registerUser(testInput);

    const secondInput: RegisterInput = {
      email: 'different@example.com',
      password: 'different123',
      name: 'Different User'
    };

    const secondUser = await registerUser(secondInput);

    expect(firstUser.email).toEqual('test@example.com');
    expect(secondUser.email).toEqual('different@example.com');
    expect(firstUser.id).not.toEqual(secondUser.id);

    // Verify both users exist in database
    const users = await db.select().from(usersTable).execute();
    expect(users).toHaveLength(2);
  });
});
