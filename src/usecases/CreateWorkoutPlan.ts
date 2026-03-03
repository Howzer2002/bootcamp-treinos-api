import { prisma } from "../lib/db.js";
import { WeekDay } from "../generated/prisma/enums.js";
import { NotFoundError } from "../errors/index.js";

// Data Transfer Object
interface Dto {
  userId: string;
  name: string;
  workoutDays: Array<{
    name: string;
    weekDay: WeekDay;
    isRest: boolean;
    estimatedDurationInMinutes: number;
    exercises: Array<{
      name: string;
      sets: number;
      reps: number;
      restTimeInSeconds: number;
    }>;
  }>;
}

export class CreateWorkoutPlan {
  async execute(dto: Dto) {
    const existingWorkoutPlan = await prisma.workoutPlan.findFirst({
      where: {
        userId: dto.userId,
        isActive: true,
      },
    });

    // Atomecidade: garantir que apenas um treino esteja ativo por usuário ( ou acontece tudo de uma vez ou nada acontece)

    return prisma.$transaction(async (tx) => {
      // Se existir um treino ativo, desativa ele
      if (existingWorkoutPlan) {
        await tx.workoutPlan.update({
          where: {
            id: existingWorkoutPlan.id,
          },
          data: {
            isActive: false,
          },
        });
      }
      const workoutPlan = await tx.workoutPlan.create({
        data: {
          name: dto.name,
          userId: dto.userId,
          isActive: true,
          workoutDay: {
            create: dto.workoutDays.map((workoutDay) => ({
              name: workoutDay.name,
              weekDay: workoutDay.weekDay,
              isRest: workoutDay.isRest,
              estimatedDurationInMinutes: workoutDay.estimatedDurationInMinutes,
              exercises: {
                create: workoutDay.exercises.map((exercise) => ({
                  name: exercise.name,
                  sets: exercise.sets,
                  reps: exercise.reps,
                  restTimeInSeconds: exercise.restTimeInSeconds,
                })),
              },
            })),
          },
        },
      });
      const result = await tx.workoutPlan.findUnique({
        where: {
          id: workoutPlan.id,
        },
        include: {
          workoutDay: {
            include: {
              exercises: true,
            },
          },
        },
      });
      if (!result) {
        throw new NotFoundError("Plano de treino não encontrado");
      }
      return result;
    });
  }
}
