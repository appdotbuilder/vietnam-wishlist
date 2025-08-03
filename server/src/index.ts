
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import { 
  registerInputSchema, 
  loginInputSchema, 
  googleAuthInputSchema,
  createPlaceInputSchema,
  updatePlaceInputSchema,
  getUserPlacesInputSchema,
  getUserStatsInputSchema
} from './schema';
import { deletePlaceInputSchema } from './handlers/delete_place';

// Import handlers
import { registerUser } from './handlers/register_user';
import { loginUser } from './handlers/login_user';
import { googleAuth } from './handlers/google_auth';
import { createPlace } from './handlers/create_place';
import { getUserPlaces } from './handlers/get_user_places';
import { updatePlace } from './handlers/update_place';
import { deletePlace } from './handlers/delete_place';
import { getUserStats } from './handlers/get_user_stats';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  register: publicProcedure
    .input(registerInputSchema)
    .mutation(({ input }) => registerUser(input)),

  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),

  googleAuth: publicProcedure
    .input(googleAuthInputSchema)
    .mutation(({ input }) => googleAuth(input)),

  // Place management routes
  createPlace: publicProcedure
    .input(createPlaceInputSchema)
    .mutation(({ input }) => createPlace(input)),

  getUserPlaces: publicProcedure
    .input(getUserPlacesInputSchema)
    .query(({ input }) => getUserPlaces(input)),

  updatePlace: publicProcedure
    .input(updatePlaceInputSchema)
    .mutation(({ input }) => updatePlace(input)),

  deletePlace: publicProcedure
    .input(deletePlaceInputSchema)
    .mutation(({ input }) => deletePlace(input)),

  // Statistics route
  getUserStats: publicProcedure
    .input(getUserStatsInputSchema)
    .query(({ input }) => getUserStats(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
