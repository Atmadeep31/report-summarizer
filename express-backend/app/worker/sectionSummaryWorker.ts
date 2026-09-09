import { Worker, Job } from "bullmq";
import { SECTION_SUMMARY_QUEUE } from "../queues/summaryQueue.js";
import generateSectionSummary from "../services/sectionSumamry/sectionSummaryLLM.js";
import { prisma } from "../../lib/prisma.js";
import { redisConnection } from "../../lib/bullmq.js";
export interface sectionSumamryData {
    pdfId: string;
    pdfName: string;
    userEmail: string;
    sectionIndex: number;
    sectionText: string;
}

export const sectionWorker = new Worker<sectionSumamryData>(
    SECTION_SUMMARY_QUEUE,
    async function workerFunction(job: Job<sectionSumamryData>) {

        const { pdfId, pdfName, userEmail, sectionIndex, sectionText } = job.data;
        const sectionSummary = await generateSectionSummary({ markdownSection: sectionText });
        if (!sectionSummary) {
            console.log(`Failed to generate section summary for pdfId: ${pdfId}, sectionIndex: ${sectionIndex}`);
            throw new Error(`Failed to generate section summary for pdfId: ${pdfId}, sectionIndex: ${sectionIndex}`);
        }
        if (pdfId && pdfName && userEmail) {
            try {
                await prisma.sectionSummary.create({
                    data: {
                        pdf_id: pdfId,
                        pdf_name: pdfName,
                        email: userEmail,
                        section_index: sectionIndex,
                        summary: sectionSummary.summary
                    }
                })
                console.log(`Section summary created for pdfId: ${pdfId}, sectionIndex: ${sectionIndex}`);
            }
            catch (error) {
                console.error(`Failed to create section summary for pdfId: ${pdfId}, sectionIndex: ${sectionIndex}`, error);
                throw error;

            }
        }
    },
    {
        connection: redisConnection,
        concurrency: 3,
    }
)

sectionWorker.on("completed", (job: Job<sectionSumamryData>) => {
    console.log(`Job ${job.id} completed successfully`);
});
sectionWorker.on("failed", (job, err) => {
    console.log(`Job ${job.id} failed with error:`, err);
})
