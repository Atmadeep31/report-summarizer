import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { redis } from '../../lib/redis.js';
import { chunkSummary } from './sectionSumamry/allSectionSummary.js';
import { prisma } from '../../lib/prisma.js';

// Schema structure defining what the AI should produce for Company Reports
const finalReportSchema = z.object({
    summary: z.string().describe('A detailed summary of the company report covering key highlights and main points in Markdown format'),
    keyTakeaways: z.array(z.string()).describe('Critical takeaways, key metrics, or strategic insights extracted from the report sections')
});

export type FinalReport = z.infer<typeof finalReportSchema>;

/**
 * Sends section summaries to Gemini and generates a structured final company report summary
 * @param allSectionSummaries - Combined summaries of all sections
 */
export async function generateReportSummary(allSectionSummaries: string): Promise<FinalReport> {
    if (!allSectionSummaries || !allSectionSummaries.trim()) {
        throw new Error("Section summaries text cannot be empty when generating report summary.");
    }

    try {
        const result = await generateObject({
            model: google('gemini-3.6-flash'),
            schema: finalReportSchema,
            prompt: `Analyze the following section summaries from a company report and generate a final structured company report summary containing:
1. A comprehensive executive summary of the report.
2. A bulleted list of key takeaways, critical findings, and strategic takeaways extracted from the section summaries.

Here is the document content:
${allSectionSummaries}`
        });

        return result.object;
    } catch (error) {
        console.error('[generateSummary] Error generating report summary with AI:', error);
        throw error;
    }
}

export async function generateFullSummary(
    cachekey: string,
    pdfId?: string,
    pdfName?: string,
    userEmail?: string
): Promise<{ finalSummary: FinalReport; message: string }> {
    try {
        if (!cachekey) {
            throw new Error("cachekey parameter is required for generateFullSummary.");
        }

        const summariesData: string | null = await redis.get(cachekey);
        if (!summariesData) {
            throw new Error(`No section summaries found in Redis for key: ${cachekey}`);
        }

        let allSummary: chunkSummary[];
        try {
            allSummary = typeof summariesData === 'string' ? JSON.parse(summariesData) : summariesData;
        } catch (e) {
            throw new Error(`Failed to parse section summaries from Redis for key: ${cachekey}`);
        }

        if (!Array.isArray(allSummary) || allSummary.length === 0) {
            throw new Error(`Invalid or empty section summaries array in Redis for key: ${cachekey}`);
        }

        let combinedSummaryText = "";
        allSummary.forEach((chunk) => {
            if (chunk?.summary) {
                combinedSummaryText += chunk.summary + "\n\n";
            }
        });

        if (!combinedSummaryText.trim()) {
            throw new Error("Combined section summary content is empty.");
        }

        const finalSummary = await generateReportSummary(combinedSummaryText);

        // Update database with final summary for persistence and source of truth
        if (pdfId && pdfName && userEmail) {
            try {
                await prisma.fullSummary.upsert({
                    where: {
                        pdf_id: pdfId
                    },
                    update: {
                        pdf_name: pdfName,
                        email: userEmail,
                        summary: JSON.stringify(finalSummary)
                    },
                    create: {
                        pdf_id: pdfId,
                        pdf_name: pdfName,
                        email: userEmail,
                        summary: JSON.stringify(finalSummary)
                    }
                });
            } catch (dbError) {
                console.error(`[generateSummary] Failed to update FullSummary in DB for pdfId ${pdfId}:`, dbError);
            }
        }

        return {
            finalSummary,
            message: "full summary generated"
        };
    } catch (error) {
        console.error(`[generateSummary] Error in generateFullSummary for key ${cachekey}:`, error);
        throw error;
    }
}


