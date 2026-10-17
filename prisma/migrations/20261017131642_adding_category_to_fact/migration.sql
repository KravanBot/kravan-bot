/*
  Warnings:

  - Added the required column `category` to the `Fact` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Fact" ADD COLUMN     "category" TEXT NOT NULL;
