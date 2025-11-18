// TS + pnpm + Prisma are confused about this import in the monorepo,
// but at runtime it works. So we ignore the type-check here.
// @ts-ignore
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

export const prisma = new PrismaClient();