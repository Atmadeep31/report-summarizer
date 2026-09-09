import { Queue, FlowProducer } from 'bullmq';
import { redisConnection } from '../../lib/bullmq.js';
import { redis } from '../../lib/redis.js';
import type { PdfChunk } from '../services/pdfSection.js';
export const SECTION_SUMMARY_QUEUE = 'section-summary-queue';
export const FINAL_SUMMARY_QUEUE = 'final-summary-queue';

export const flowProducer = new FlowProducer({
    connection: redisConnection
});

export async function enquePdfSummarization(
    cacheKey: string,
    pdfId: string,
    pdfName: string,
    userEmail: string
) {
    const rawChunks = await redis.get(cacheKey);
    if (!rawChunks) {
        throw new Error(`No chunks found in redis for cacheKey: ${cacheKey}`);
    }

    const sections: PdfChunk[] = typeof rawChunks === "string" ? JSON.parse(rawChunks) : rawChunks;
    const flow = await flowProducer.add({
        name: 'combine-and-summarize',
        queueName: FINAL_SUMMARY_QUEUE,
        data: {
            pdfId,
            pdfName,
            userEmail,
            totalSections: sections.length
        },
        opts: {
            failParentOnFailure: true
        },
        children: sections.map((chunk) => ({
            name: 'summarize-section',
            queueName: SECTION_SUMMARY_QUEUE,
            data: {
                pdfId,
                pdfName,
                userEmail,
                sectionIndex: chunk.id,
                sectionText: chunk.section
            },
            opts: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000
                }
            }
        }))
    })
    // create both workers !
    return flow;
}

