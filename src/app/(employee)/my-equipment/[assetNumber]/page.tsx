import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/db/client";
import { equipmentWorkPath } from "@/lib/equipment-entry";

export default async function MyEquipmentDetail({ params }: { params: Promise<{ assetNumber: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { assetNumber } = await params;
  const equipment = await prisma.equipment.findUnique({ where: { assetNumber }, include: { assignments: { where: { endedAt: null, userId: user.id }, take: 1 } } });
  if (!equipment || !equipment.assignments.length) notFound();
  redirect(equipmentWorkPath(equipment.publicCode));
}
