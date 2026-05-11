-- CreateEnum
CREATE TYPE "BarMemberRole" AS ENUM ('staff', 'viewer');

-- CreateTable
CREATE TABLE "BarMember" (
    "id" TEXT NOT NULL,
    "barId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "BarMemberRole" NOT NULL DEFAULT 'staff',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BarMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BarMember_barId_userId_key" ON "BarMember"("barId", "userId");

-- CreateIndex
CREATE INDEX "BarMember_userId_idx" ON "BarMember"("userId");

-- AddForeignKey
ALTER TABLE "BarMember" ADD CONSTRAINT "BarMember_barId_fkey" FOREIGN KEY ("barId") REFERENCES "Bar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BarMember" ADD CONSTRAINT "BarMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
