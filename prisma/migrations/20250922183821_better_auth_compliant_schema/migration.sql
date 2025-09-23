/*
  Warnings:

  - You are about to drop the column `password` on the `Account` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Account" DROP COLUMN "password";

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "password" TEXT;
