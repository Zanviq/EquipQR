import { z } from "zod";
import { requireRequestUser } from "@/server/auth/current-user";
import { prisma } from "@/server/db/client";
import { DomainError } from "@/server/domain/errors";
import { assertSameOrigin, domainErrorResponse } from "@/server/http/response";
import { buildEquipmentQrUrl } from "@/server/equipment/public-code";

const schema = z.object({
  ids: z.array(z.uuid()).min(1).max(200).refine((ids) => new Set(ids).size === ids.length, "중복된 장비가 포함되어 있습니다.")
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireRequestUser(request, "ADMIN");
    const input = schema.parse(await request.json());
    const equipment = await prisma.equipment.findMany({
      where: { id: { in: input.ids }, retiredAt: null },
      select: { id: true, name: true, assetNumber: true, publicCode: true }
    });
    if (equipment.length !== input.ids.length) throw new DomainError("EQUIPMENT_SELECTION_STALE", "선택한 장비 중 인쇄할 수 없는 항목이 있습니다.", 409);
    const byId = new Map(equipment.map((item) => [item.id, item]));
    const origin = process.env.APP_ORIGIN ?? "http://localhost:3000";
    const items = input.ids.map((id) => {
      const item = byId.get(id)!;
      return { id: item.id, name: item.name, assetNumber: item.assetNumber, qrUrl: buildEquipmentQrUrl(origin, item.publicCode).toString() };
    });
    return Response.json({ items }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return domainErrorResponse(error);
  }
}
