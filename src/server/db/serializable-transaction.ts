import type { Prisma } from "@/generated/prisma/client";
import { mapTransactionError } from "@/server/circulation/transaction-error";
import { prisma } from "./client";

const MAX_ATTEMPTS = 3;

function errorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
}

export async function runSerializableTransaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(operation, { isolationLevel: "Serializable" });
    } catch (error) {
      if (errorCode(error) !== "P2034") throw error;
      if (attempt === MAX_ATTEMPTS) mapTransactionError(error);
    }
  }
  throw new Error("Serializable transaction retry loop exhausted unexpectedly");
}
