-- AlterTable
ALTER TABLE "Book" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "deletedAt" DATETIME;
