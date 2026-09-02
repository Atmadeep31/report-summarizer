import { redis } from '../../lib/redis.js';

export interface PdfChunk {
    id: number;
    section: string;
}

/**
 * Splits markdown text into chunks of approximately targetChunkSize (default 8000 chars).
 * Ensures markdown tables are not split midway even if chunk size exceeds targetChunkSize.
 */
export function chunkMarkdown(markdown: string, targetChunkSize = 8000): PdfChunk[] {
    if (!markdown || markdown.trim().length === 0) {
        return [];
    }

    const lines = markdown.split(/\r?\n/);
    const chunks: PdfChunk[] = [];

    let currentLines: string[] = [];
    let currentLength = 0;
    let chunkId = 1;

    function checkTableLine(line: string): boolean {
        const trimmed = line.trim();
        return trimmed.startsWith('|') && trimmed.endsWith('|');
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (checkTableLine(line)) {
            while (i < lines.length && checkTableLine(lines[i])) {
                currentLines.push(lines[i]);
                currentLength += lines[i].length + 1; // +1 for newline
                i++;
            }
            i--; // Adjust index because for loop will increment i
        } else {
            currentLines.push(line);
            currentLength += line.length + 1;
        }

        if (currentLength >= targetChunkSize) {
            chunks.push({
                id: chunkId++,
                section: currentLines.join('\n')
            });
            currentLines = [];
            currentLength = 0;
        }
    }

    if (currentLines.length > 0) {
        chunks.push({
            id: chunkId++,
            section: currentLines.join('\n')
        });
    }

    return chunks;
}

/**
 * Caches PDF markdown chunks in Upstash Redis with a 30-minute (1800s) TTL.
 */
export async function cachePdfChunks(filename: string, chunks: PdfChunk[]): Promise<string> {
    try {
        if (!filename) throw new Error("Filename is required for caching PDF chunks.");
        const cacheKey = `pdf:chunks:${filename}`;
        await redis.set(cacheKey, JSON.stringify(chunks), { ex: 1800 });
        return cacheKey;
    } catch (error) {
        console.error(`[pdfSection] Error in cachePdfChunks for ${filename}:`, error);
        throw error;
    }
}

/**
 * Utility function to process pdf markdown into cached chunks
 */
export async function getPdfSections(markdown: string, filename: string): Promise<string> {
    try {
        const chunks = chunkMarkdown(markdown);
        const cacheKey = await cachePdfChunks(filename, chunks);
        return cacheKey;
    } catch (error) {
        console.error(`[pdfSection] Error in getPdfSections for ${filename}:`, error);
        throw error;
    }
}