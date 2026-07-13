import { prisma } from "@/server/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1 AS connected`;
    const activeAdminCount = await prisma.user.count({
      where: { role: "ADMIN", status: "ACTIVE" }
    });

    if (activeAdminCount === 0) {
      return Response.json(
        {
          status: "not_ready",
          checks: { database: "ok", activeAdmin: "missing" }
        },
        { status: 503 }
      );
    }

    return Response.json({
      status: "ok",
      checks: { database: "ok", activeAdmin: "ok" }
    });
  } catch {
    return Response.json(
      {
        status: "not_ready",
        checks: { database: "unavailable", activeAdmin: "unknown" }
      },
      { status: 503 }
    );
  }
}
