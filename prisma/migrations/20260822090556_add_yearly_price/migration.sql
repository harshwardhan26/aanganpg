-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "yearlyPrice" INTEGER,
ALTER COLUMN "price" DROP NOT NULL;
