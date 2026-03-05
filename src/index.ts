import fastifySwagger from "@fastify/swagger";
import dotenv from "dotenv";
import fastifyCors from "@fastify/cors";
import apiReference from "@scalar/fastify-api-reference";
import { workoutPlanRoutes } from "./routes/workout-plan.js";

dotenv.config();
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
} from "fastify-type-provider-zod";

import Fastify from "fastify";
import { auth } from "./lib/auth.js";

const fastify = Fastify({ logger: true });

fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

await fastify.register(fastifySwagger, {
  openapi: {
    info: {
      title: "Bootcamp Treinos API",
      description: "API para o bootcamp de treinos do FSC",
      version: "1.0.0",
    },
    servers: [{ description: "Produção", url: "http://localhost:8081" }],
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

// swagger.json
fastify.get("/swagger.json", { schema: { hide: true } }, async () =>
  fastify.swagger(),
);

// auth routes
fastify.route({
  method: ["GET", "POST"],
  url: "/api/auth/*",
  async handler(request, reply) {
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const headers = new Headers();
      Object.entries(request.headers).forEach(([key, value]) => {
        if (value) headers.append(key, value.toString());
      });
      const req = new Request(url.toString(), {
        method: request.method,
        headers,
        ...(request.body ? { body: JSON.stringify(request.body) } : {}),
      });
      const response = await auth.handler(req);
      reply.status(response.status);
      response.headers.forEach((value, key) => reply.header(key, value));
      reply.send(response.body ? await response.text() : null);
    } catch (error) {
      fastify.log.error(error);
      reply
        .status(500)
        .send({ error: "Internal authentication error", code: "AUTH_FAILURE" });
    }
  },
});

// feature routes
await fastify.register(workoutPlanRoutes);

try {
  await fastify.listen({ port: Number(process.env.PORT) || 8081 });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
