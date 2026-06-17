ALTER TABLE "attendance_sessions" ADD COLUMN "period_no" integer;--> statement-breakpoint
UPDATE "attendance_sessions" SET "period_no" = 1 WHERE "period_no" IS NULL;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ALTER COLUMN "period_no" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_sessions_section_date_period_idx" ON "attendance_sessions" USING btree ("section_id","class_date","period_no");