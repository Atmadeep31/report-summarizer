import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

export default async function generateSectionSummary({ markdownSection }: { markdownSection: string }) {
    if (!markdownSection || !markdownSection.trim()) {
        throw new Error("markdownSection is required and cannot be empty.");
    }

    try {
        const result = await generateObject({
            model: google('gemini-3.6-flash'),
            schema: z.object({
                summary: z.string().describe('Detailed Markdown summary of the main points and key takeaways from this document section.'),
            }),
            prompt: `Analyze the following section of a larger document and generate a thorough, detailed summary in Markdown format without omitting key details:

${markdownSection}`
        });

        return result.object;
    } catch (error) {
        console.error('[sectionSummaryLLM] Error generating section summary:', error);
        throw error;
    }
}