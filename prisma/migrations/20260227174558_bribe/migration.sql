-- AlterTable
ALTER TABLE "User" ADD COLUMN     "boost" JSONB,
ADD COLUMN     "can_bribe_in" TIMESTAMP(3),
ADD COLUMN     "can_steal_in" TIMESTAMP(3),
ADD COLUMN     "last_steal" JSONB;
