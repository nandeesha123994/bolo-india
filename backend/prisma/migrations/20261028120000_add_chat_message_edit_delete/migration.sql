ALTER TABLE "ChatMessage"
ADD COLUMN "editedAt" TIMESTAMP(3),
ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE TABLE "ChatMessageDeletion" (
    "messageId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessageDeletion_pkey" PRIMARY KEY ("messageId", "userId")
);

CREATE INDEX "ChatMessageDeletion_userId_deletedAt_idx"
ON "ChatMessageDeletion"("userId", "deletedAt");

ALTER TABLE "ChatMessageDeletion"
ADD CONSTRAINT "ChatMessageDeletion_messageId_fkey"
FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChatMessageDeletion"
ADD CONSTRAINT "ChatMessageDeletion_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
