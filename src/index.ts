import fastifySwagger from "@fastify/swagger";
import dotenv from "dotenv";
import fastifyCors from "@fastify/cors";
import apiReference from "@scalar/fastify-api-reference";
import { fromNodeHeaders } from "better-auth/node";
import { CreateWorkoutPlan } from "./usecases/CreateWorkoutPlan.js";
import { NotFoundError } from "./errors/index.js";
import { workoutPlanRoutes } from "./routes/workout-plan.js";

dotenv.config();
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
  jsonSchemaTransform,
} from "fastify-type-provider-zod";
import { WeekDay } from "./generated/prisma/enums.js";

// Import the framework and instantiate it
import Fastify from "fastify";
import { auth } from "./lib/auth.js";
import { ErrorSchema, WorkoutPlanSchema } from "./schemas/index.js";
const fastify = Fastify({
  logger: true,
});

fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

await fastify.register(fastifySwagger, {
  openapi: {
    info: {
      title: "Bootcamp Treinos API",
      description: "API para o bootcamp de treinos do FSC",
      version: "1.0.0",
    },
    servers: [
      {
        description: "Produção",
        url: "http://localhost:8081",
      },
    ],
  },
  transform: jsonSchemaTransform,
});

await fastify.register(fastifyCors, {
  origin: ["http://localhost:3000"],
  credentials: true,
});

await fastify.register(apiReference, {
  routePrefix: "/docs",
  configuration: {
    sources: [
      {
        title: "Bootcamp Treinos API",
        slug: "bootcamp-treinos-api",
        url: "/swagger.json",
      },
      {
        title: "Auth API",
        slug: "auth-api",
        url: "/api/auth/open-api/generate-schema",
      },
    ],
  },
});

fastify.withTypeProvider<ZodTypeProvider>().route({
  method: "POST",
  url: "/workouts-plans",
  schema: {
    body: WorkoutPlanSchema.omit({ id: true }),
    response: {
      201: WorkoutPlanSchema,
      400: ErrorSchema,
      401: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema,
    },
  },
  handler: async (request, reply) => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });
      if (!session) {
        return reply.status(401).send({
          error: "Unauthorized",
          code: "UNAUTHORIZED",
        });
      }

      fastify.withTypeProvider<ZodTypeProvider>().route({
        method: "GET",
        url: "/swagger.json",
        handler: async (request, reply) => {
          reply.send(fastify.swagger());
        },
      });

      fastify.withTypeProvider<ZodTypeProvider>().route({
        method: "GET",
        url: "/",
        schema: {
          description: "hello World  ",
        },
        handler: async (request, reply) => {
          reply.send("hello World");
        },
      });

      const createWorkoutPlan = new CreateWorkoutPlan();
      const result = await createWorkoutPlan.execute({
        userId: session.user.id,
        name: request.body.name,
        workoutDays: request.body.workoutDays,
      });

      if (!result) {
        return reply.status(400).send({
          error: "Erro ao criar plano de treino",
          code: "WORKOUT_PLAN_NOT_CREATED",
        });
      }

      return reply.status(201).send({
        id: result.id,
        name: result.name,
        workoutDays: result.workoutDay,
      });
    } catch (error) {
      fastify.log.error(error);
      if (error instanceof NotFoundError) {
        return reply.status(404).send({
          error: error.message,
          code: "NOT_FOUND",
        });
      }
      return reply.status(500).send({
        error: "Internal server error",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },
});

//routes
await fastify.register(workoutPlanRoutes, { prefix: "/workouts-plans" });

// Run the server!
try {
  await fastify.listen({ port: Number(process.env.PORT) || 8081 });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
