import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });
// quando a gente roda o servidor em desenvolviemento, toda vez que a pessoa salva o arquivo o servidor é reiniciado,
// então a conexão com o banco de dados é perdida (o postgrees é reiniciado)
// por isso a gente usa o globalForPrisma para manter a conexão com o banco de dados

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
