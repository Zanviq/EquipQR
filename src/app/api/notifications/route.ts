import { z } from "zod";
import { requireRequestUser } from "@/server/auth/current-user";
import { prisma } from "@/server/db/client";
import { assertSameOrigin, domainErrorResponse } from "@/server/http/response";

const readSchema = z.object({
  auditEventIds: z.array(z.uuid()).min(1).max(10)
});

export async function GET(request: Request) {
  try {
    const user = await requireRequestUser(request);
    const rows = await prisma.userNotification.findMany({
      where: { userId: user.id, readAt: null },
      take: 10,
      orderBy: [{ createdAt: "asc" }, { auditEventId: "asc" }],
      include: {
        auditEvent: {
          include: {
            equipment: { select: { name: true } },
            previousUser: { select: { name: true } },
            nextUser: { select: { name: true } }
          }
        }
      }
    });
    const notifications = rows.map((row) => {
      const event = row.auditEvent;
      const equipmentName = event.equipment?.name ?? "장비";
      const isSender = event.previousUserId === user.id;
      return {
        id: row.auditEventId,
        title: "전달이 완료되었습니다.",
        message: isSender
          ? `${equipmentName} 장비가 ${event.nextUser?.name ?? "다음 사용자"}님에게 전달되었습니다.`
          : `${equipmentName} 장비를 ${event.previousUser?.name ?? "이전 사용자"}님에게 전달받았습니다.`,
        createdAt: row.createdAt.toISOString()
      };
    });
    return Response.json({ notifications }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return domainErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request);
    const input = readSchema.parse(await request.json());
    const result = await prisma.userNotification.updateMany({
      where: { userId: user.id, auditEventId: { in: input.auditEventIds }, readAt: null },
      data: { readAt: new Date() }
    });
    return Response.json({ ok: true, count: result.count });
  } catch (error) {
    return domainErrorResponse(error);
  }
}
