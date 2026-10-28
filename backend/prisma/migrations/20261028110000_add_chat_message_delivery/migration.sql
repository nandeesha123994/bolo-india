ALTER TABLE "ChatMessage" ADD COLUMN "deliveredAt" TIMESTAMP(3);

UPDATE "ChatMessage"
SET "deliveredAt" = "readAt"
WHERE "readAt" IS NOT NULL;
