/*
  Warnings:

  - You are about to drop the column `pdf_name` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "User_pdf_name_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "pdf_name";

-- CreateTable
CREATE TABLE "PdfDocument" (
    "id" TEXT NOT NULL,
    "pdf_name" TEXT NOT NULL,
    "file_hash" TEXT,
    "user_email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PdfDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FullSummary" (
    "id" TEXT NOT NULL,
    "pdf_id" TEXT NOT NULL,
    "pdf_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FullSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionSummary" (
    "id" TEXT NOT NULL,
    "pdf_id" TEXT NOT NULL,
    "pdf_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "section_title" TEXT,
    "section_index" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SectionSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PdfDocument_user_email_pdf_name_key" ON "PdfDocument"("user_email", "pdf_name");

-- CreateIndex
CREATE UNIQUE INDEX "FullSummary_pdf_id_key" ON "FullSummary"("pdf_id");

-- AddForeignKey
ALTER TABLE "PdfDocument" ADD CONSTRAINT "PdfDocument_user_email_fkey" FOREIGN KEY ("user_email") REFERENCES "User"("email") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FullSummary" ADD CONSTRAINT "FullSummary_pdf_id_fkey" FOREIGN KEY ("pdf_id") REFERENCES "PdfDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionSummary" ADD CONSTRAINT "SectionSummary_pdf_id_fkey" FOREIGN KEY ("pdf_id") REFERENCES "PdfDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
