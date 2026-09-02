import { prisma } from '../../lib/prisma.js';
import { convertPdfToMarkdown } from './pdfService.js';
import { getPdfFromS3 } from './receivepdf.js';
import { getPdfSections } from './pdfSection.js';
import { generateAllSectionSummaries } from './sectionSumamry/allSectionSummary.js';
import { generateFullSummary } from './generateSummary.js';

export interface ProcessPdfResult {
    success: boolean;
    filename: string;
    finalSummary?: any;
    message?: string;
    fromCache?: boolean;
}

/**
 * Checks DB if pdf-summary already exists. If it exists, returns stored summary.
 * If not, retrieves PDF from AWS S3 using s3Key, performs conversion and summarization steps sequentially and caches in DB.
 */
export async function processPdfAndSummarize(
    s3Key: string,
    userEmail: string = "[EMAIL_ADDRESS]"
): Promise<ProcessPdfResult> {
    try {
        if (!s3Key) {
            throw new Error("s3Key is required.");
        }

        const normalizedEmail = userEmail.trim() || "[EMAIL_ADDRESS]";
        const pdfName = s3Key;

        // 1. Ensure User exists in DB
        await prisma.user.upsert({
            where: { email: normalizedEmail },
            update: {},
            create: { email: normalizedEmail }
        });

        // 2. Upsert PdfDocument record in DB
        const pdfDoc = await prisma.pdfDocument.upsert({
            where: {
                user_email_pdf_name: {
                    user_email: normalizedEmail,
                    pdf_name: pdfName
                }
            },
            update: { pdf_name: pdfName },
            create: {
                user_email: normalizedEmail,
                pdf_name: pdfName
            }
        });

        // 3. Check DB if FullSummary already exists
        const existingFullSummary = await prisma.fullSummary.findUnique({
            where: { pdf_id: pdfDoc.id }
        });

        if (existingFullSummary) {
            try {
                const parsedSummary = JSON.parse(existingFullSummary.summary);
                return {
                    success: true,
                    filename: pdfName,
                    finalSummary: parsedSummary,
                    message: "Retrieved full summary from database cache",
                    fromCache: true
                };
            } catch (parseErr) {
                console.warn(`[summarizer] Failed to parse cached DB summary for pdf_id ${pdfDoc.id}, re-generating:`, parseErr);
            }
        }

        // 4. Retrieve PDF from AWS S3 & Convert PDF to Markdown
        const { buffer } = await getPdfFromS3(s3Key);
        const conversionResult = await convertPdfToMarkdown(buffer, pdfName);

        // 5. Chunk Markdown and store chunks in Redis
        const cacheKey = await getPdfSections(conversionResult.markdown, conversionResult.filename);

        // 6. Generate section summaries, store in Redis and Postgres DB
        await generateAllSectionSummaries(cacheKey, pdfDoc.id, conversionResult.filename, normalizedEmail);

        // 7. Generate full study guide summary, update Postgres DB
        const studySummary = await generateFullSummary(cacheKey, pdfDoc.id, conversionResult.filename, normalizedEmail);

        return {
            success: true,
            filename: conversionResult.filename,
            finalSummary: studySummary.finalSummary,
            message: studySummary.message,
            fromCache: false
        };
    } catch (error: any) {
        console.error('[summarizer] Error in processPdfAndSummarize:', error);
        throw error;
    }
}