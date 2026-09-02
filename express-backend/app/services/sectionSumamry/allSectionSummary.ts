import { redis } from "../../../lib/redis.js";
import generateSectionSummary from "./sectionSummaryLLM.js";
import { PdfChunk } from "../pdfSection.js";
import { prisma } from "../../../lib/prisma.js";

export interface chunkSummary {
    id: number;
    summary: string;
}

export async function generateAllSectionSummaries(
    cacheKey: string,
    pdfId?: string,
    pdfName?: string,
    userEmail?: string
): Promise<string> {
    try {
        if (!cacheKey) {
            throw new Error("cacheKey is required to generate section summaries.");
        }

        const chunksData: string | null = await redis.get(cacheKey);
        if (!chunksData) {
            throw new Error(`No chunk data found in Redis for key: ${cacheKey}`);
        }

        let parsedChunks: PdfChunk[];
        try {
            parsedChunks = typeof chunksData === 'string' ? JSON.parse(chunksData) : chunksData;
        } catch (e) {
            throw new Error(`Failed to parse chunk data from Redis for key: ${cacheKey}`);
        }

        if (!Array.isArray(parsedChunks) || parsedChunks.length === 0) {
            throw new Error(`Invalid or empty chunk array in Redis for key: ${cacheKey}`);
        }

        const summaries: chunkSummary[] = [];

        for (const chunk of parsedChunks) {
            const sectionResult = await generateSectionSummary({ markdownSection: chunk.section });
            if (!sectionResult || !sectionResult.summary) {
                throw new Error(`Failed to generate summary for section ID ${chunk.id}`);
            }
            summaries.push({ id: chunk.id, summary: sectionResult.summary });
        }

        // Save section summaries into Postgres DB if metadata is provided
        if (pdfId && pdfName && userEmail) {
            try {
                await prisma.sectionSummary.deleteMany({
                    where: { pdf_id: pdfId }
                });
                await prisma.sectionSummary.createMany({
                    data: summaries.map((s) => ({
                        pdf_id: pdfId,
                        pdf_name: pdfName,
                        email: userEmail,
                        section_index: s.id,
                        summary: s.summary
                    }))
                });
            } catch (dbError) {
                console.error(`[allSectionSummary] Failed to save section summaries to DB for pdfId ${pdfId}:`, dbError);
            }
        }

        // Store section summaries array in Redis with a 30-minute TTL
        await redis.set(cacheKey, JSON.stringify(summaries), { ex: 1800 });

        return cacheKey;
    } catch (error) {
        console.error(`[allSectionSummary] Error generating all section summaries for key ${cacheKey}:`, error);
        throw error;
    }
}