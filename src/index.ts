import { z } from "zod";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUI from "@fastify/swagger-ui";
import dotenv from "dotenv";
dotenv.config();
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
  jsonSchemaTransform,
} from "fastify-type-provider-zod";

// Import the framework and instantiate it
import Fastify from "fastify";
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

await fastify.register(fastifySwaggerUI, {
  routePrefix: "/docs",
});

fastify.withTypeProvider<ZodTypeProvider>().route({
  method: "GET",
  url: "/",
  schema: {
    description: "Deu certo, meu fi ",
    tags: ["Hello"],
    response: {
      200: z.object({
        message: z.string(),
      }),
    },
  },
  handler: (request, reply) => {
    reply.send({ message: "Hello World" });
  },
});

// Run the server!
try {
  await fastify.listen({ port: Number(process.env.PORT) || 8081 });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
