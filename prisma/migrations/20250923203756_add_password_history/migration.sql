-- CreateTable
CREATE TABLE "public"."passwordHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "passwordHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "passwordHistory_userId_createdAt_idx" ON "public"."passwordHistory"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."passwordHistory" ADD CONSTRAINT "passwordHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
