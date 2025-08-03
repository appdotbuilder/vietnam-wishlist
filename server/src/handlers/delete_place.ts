
import { db } from '../db';
import { placesTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

export const deletePlaceInputSchema = z.object({
    id: z.number(),
    user_id: z.number()
});

export type DeletePlaceInput = z.infer<typeof deletePlaceInputSchema>;

export async function deletePlace(input: DeletePlaceInput): Promise<{ success: boolean }> {
    try {
        // Verify place exists and belongs to user, then delete it
        const result = await db.delete(placesTable)
            .where(and(
                eq(placesTable.id, input.id),
                eq(placesTable.user_id, input.user_id)
            ))
            .returning()
            .execute();

        // If no rows were deleted, the place either doesn't exist or doesn't belong to the user
        if (result.length === 0) {
            return { success: false };
        }

        return { success: true };
    } catch (error) {
        console.error('Place deletion failed:', error);
        throw error;
    }
}
