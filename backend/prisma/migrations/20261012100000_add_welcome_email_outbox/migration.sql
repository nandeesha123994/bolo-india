-- CreateTable
CREATE TABLE "WelcomeEmailOutbox" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WelcomeEmailOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WelcomeEmailOutbox_userId_key" ON "WelcomeEmailOutbox"("userId");

-- CreateIndex
CREATE INDEX "WelcomeEmailOutbox_sentAt_nextAttemptAt_lockedAt_idx" ON "WelcomeEmailOutbox"("sentAt", "nextAttemptAt", "lockedAt");

-- AddForeignKey
ALTER TABLE "WelcomeEmailOutbox" ADD CONSTRAINT "WelcomeEmailOutbox_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
