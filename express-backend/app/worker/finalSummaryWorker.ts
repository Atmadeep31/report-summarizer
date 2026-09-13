import { Worker, Job } from "bullmq";
import { redisConnection } from "../../lib/bullmq.js";
import { prisma } from "../../lib/prisma.js";
import { FINAL_SUMMARY_QUEUE } from "../queues/summaryQueue.js";
import { generateReportSummary } from "../services/generateSummary.js";
import { getPdfSumamryChannel, redisPublisher } from "../../lib/redisPubSub.js";

export interface finalSummaryData {
    pdfId: string;
    pdfName: string;
    userEmail: string;
    cacheKey?: string;
    totalSections?: number;
}

export const finalSummaryWorker = new Worker<finalSummaryData>(
    FINAL_SUMMARY_QUEUE,
    async function workerFunction(job: Job<finalSummaryData>) {
        const { pdfId, pdfName, userEmail, cacheKey, totalSections } = job.data;
        try {
            const allSectionSummaries = await prisma.sectionSummary.findMany({
                where: {
                    email: userEmail,
                    pdf_id: pdfId,
                    pdf_name: pdfName
                },
                orderBy: {
                    section_index: 'asc'
                }
            })
            if (allSectionSummaries.length == 0) {
                throw new Error(`No section summaries found for pdfId: ${pdfId}, pdfName: ${pdfName}, userEmail: ${userEmail}`)
            }
            const combinedSummary: string = allSectionSummaries.map((sec) => {
                return sec.summary
            }).join('\n\n')
            const finalReport = await generateReportSummary(combinedSummary);
            await prisma.fullSummary.create({
                data: {
                    pdf_id: pdfId,
                    pdf_name: pdfName,
                    email: userEmail,
                    summary: JSON.stringify(finalReport)
                }
            });
            const channelName = getPdfSumamryChannel(pdfId);
            await redisPublisher.publish(
                channelName,
                JSON.stringify({
                    status: 'Completed',
                    pdfId,
                    pdfName,
                    userEmail
                })
            )

        } catch (error) {
            await redisPublisher.publish(
                getPdfSumamryChannel(pdfId),
                JSON.stringify({
                    status: 'Failure',
                    pdfId,
                    pdfName,
                    userEmail

                })
            )
        }

    },
    {
        connection: redisConnection,
        concurrency: 2
    }

);
finalSummaryWorker.on('completed', (job) => {
    console.log(`[finalSummaryWorker] Job ${job.id} completed.`);
});
finalSummaryWorker.on('failed', (job, err) => {
    console.error(`[finalSummaryWorker] Job ${job?.id} failed:`, err);
});
