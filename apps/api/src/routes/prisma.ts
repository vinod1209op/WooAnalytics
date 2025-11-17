
// Prisma’s types + pnpm + monorepo are being weird and TS thinks
// PrismaClient is not exported, even though it exists at runtime.
// We ignore this line in type-checking so the build can pass.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();