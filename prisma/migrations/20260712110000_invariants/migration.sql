CREATE UNIQUE INDEX "assignments_one_active_per_equipment"
ON "assignments" ("equipment_id")
WHERE "ended_at" IS NULL;

CREATE UNIQUE INDEX "transfer_tickets_one_open_per_equipment"
ON "transfer_tickets" ("equipment_id")
WHERE "used_at" IS NULL AND "cancelled_at" IS NULL;
