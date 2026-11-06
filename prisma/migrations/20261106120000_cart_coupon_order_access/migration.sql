
-- AlterTable
ALTER TABLE "Cart" ADD COLUMN     "couponCode" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "accessToken" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Order_accessToken_key" ON "Order"("accessToken");

