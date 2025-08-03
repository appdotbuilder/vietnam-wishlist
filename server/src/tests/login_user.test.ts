
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { loginUser } from '../handlers/login_user';

// Test inputs
const testUser = {
  email: 'test@example.com',
  password_hash: 'test_password_123',
  name: 'Test User'
};

const loginInput: LoginInput = {
  email: 'test@example.com',
  password: 'test_password_123'
};

const invalidLoginInput: LoginInput = {
  email: 'test@example.com',
  password: 'wrong_password'
};

const nonExistentUserInput: LoginInput = {
  email: 'nonexistent@example.com',
  password: 'any_password'
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when credentials are valid', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result = await loginUser(loginInput);

    expect(result).not.toBeNull();
    expect(result!.email).toEqual(testUser.email);
    expect(result!.name).toEqual(testUser.name);
    expect(result!.password_hash).toEqual(testUser.password_hash);
    expect(result!.google_id).toBeNull();
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when password is incorrect', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result = await loginUser(invalidLoginInput);

    expect(result).toBeNull();
  });

  it('should return null when user does not exist', async () => {
    const result = await loginUser(nonExistentUserInput);

    expect(result).toBeNull();
  });

  it('should return null when user has no password hash (Google-only user)', async () => {
    // Create Google-only user (no password hash)
    const googleUser = {
      email: 'google@example.com',
      password_hash: null,
      google_id: 'google_123',
      name: 'Google User'
    };

    await db.insert(usersTable)
      .values(googleUser)
      .execute();

    const googleLoginAttempt: LoginInput = {
      email: 'google@example.com',
      password: 'any_password'
    };

    const result = await loginUser(googleLoginAttempt);

    expect(result).toBeNull();
  });

  it('should handle case-sensitive email matching', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const uppercaseEmailInput: LoginInput = {
      email: 'TEST@EXAMPLE.COM',
      password: 'test_password_123'
    };

    const result = await loginUser(uppercaseEmailInput);

    // Should return null because email case doesn't match
    expect(result).toBeNull();
  });
});
