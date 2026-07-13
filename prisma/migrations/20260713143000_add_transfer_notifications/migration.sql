CREATE TABLE "user_notifications" (
    "user_id" UUID NOT NULL,
    "audit_event_id" UUID NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("user_id", "audit_event_id")
);

CREATE TABLE "transfer_observations" (
    "id" UUID NOT NULL,
    "observer_user_id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "source_assignment_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    CONSTRAINT "transfer_observations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "transfer_observations_source_assignment_id_key" ON "transfer_observations"("source_assignment_id");
CREATE INDEX "user_notifications_user_id_read_at_created_at_idx" ON "user_notifications"("user_id", "read_at", "created_at");
CREATE INDEX "transfer_observations_observer_user_id_resolved_at_idx" ON "transfer_observations"("observer_user_id", "resolved_at");
CREATE INDEX "transfer_observations_equipment_id_resolved_at_idx" ON "transfer_observations"("equipment_id", "resolved_at");

ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_audit_event_id_fkey" FOREIGN KEY ("audit_event_id") REFERENCES "audit_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transfer_observations" ADD CONSTRAINT "transfer_observations_observer_user_id_fkey" FOREIGN KEY ("observer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transfer_observations" ADD CONSTRAINT "transfer_observations_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transfer_observations" ADD CONSTRAINT "transfer_observations_source_assignment_id_fkey" FOREIGN KEY ("source_assignment_id") REFERENCES "assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
