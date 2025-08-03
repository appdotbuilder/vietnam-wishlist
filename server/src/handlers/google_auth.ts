
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type GoogleAuthInput, type User } from '../schema';
import { eq, or } from 'drizzle-orm';

export const googleAuth = async (input: GoogleAuthInput): Promise<User> => {
  try {
    // Check if user exists by google_id or email
    const existingUsers = await db.select()
      .from(usersTable)
      .where(
        or(
          eq(usersTable.google_id, input.google_id),
          eq(usersTable.email, input.email)
        )
      )
      .execute();

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      
      // Update existing user with Google info if needed
      const updateData: Partial<typeof usersTable.$inferInsert> = {};
      let needsUpdate = false;

      if (!existingUser.google_id && input.google_id) {
        updateData.google_id = input.google_id;
        needsUpdate = true;
      }

      if (existingUser.name !== input.name) {
        updateData.name = input.name;
        needsUpdate = true;
      }

      if (needsUpdate) {
        updateData.updated_at = new Date();
        
        const updatedUsers = await db.update(usersTable)
          .set(updateData)
          .where(eq(usersTable.id, existingUser.id))
          .returning()
          .execute();

        return updatedUsers[0];
      }

      return existingUser;
    }

    // Create new user
    const newUsers = await db.insert(usersTable)
      .values({
        email: input.email,
        google_id: input.google_id,
        name: input.name,
        password_hash: null // Google users don't have password
      })
      .returning()
      .execute();

    return newUsers[0];
  } catch (error) {
    console.error('Google auth failed:', error);
    throw error;
  }
};
