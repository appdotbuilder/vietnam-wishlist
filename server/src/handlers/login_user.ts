
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const loginUser = async (input: LoginInput): Promise<User | null> => {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      return null;
    }

    const user = users[0];

    // Check if user has a password hash (not a Google-only user)
    if (!user.password_hash) {
      return null;
    }

    // In a real implementation, you would use bcrypt.compare here
    // For now, we'll do a simple string comparison (NOT secure for production)
    const isPasswordValid = user.password_hash === input.password;

    if (!isPasswordValid) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('User login failed:', error);
    throw error;
  }
};
