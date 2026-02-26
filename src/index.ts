import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";

// Import the framework and instantiate it
import Fastify from "fastify";
const fastify = Fastify({
  logger: true,
});

fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

fastify.withTypeProvider<ZodTypeProvider>().route({
  method: "GET",
  url: "/",
  schema: {
    description: "oh, rapaz, toma cuidado",
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
