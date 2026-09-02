import { PDFParse } from 'pdf-parse';

/**
 * Converts PDF buffer byte array into Markdown.
 * @param pdfBuffer - Uint8Array or Buffer containing PDF data
 * @param filename - Name or key of the PDF document
 */
export async function convertPdfToMarkdown(
  pdfBuffer: Buffer | Uint8Array,
  filename: string
): Promise<{ filename: string; totalPages: number; markdown: string }> {
  try {
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('PDF buffer is empty or invalid.');
    }

    const parser = new PDFParse(new Uint8Array(pdfBuffer));
    await (parser as any).load();
    const parsedData = await (parser as any).getText();

    const cleanText = (parsedData.text || '').replace(/\x00/g, 'ti');
    const paragraphs = cleanText
      .split(/\n\s*\n/)
      .map((p: string) => p.trim())
      .filter(Boolean);

    const markdown = `# ${filename}\n\n` +
      `> Total Pages: ${parsedData.total || 1}\n\n` +
      paragraphs.join('\n\n');

    return {
      filename,
      totalPages: parsedData.total || 1,
      markdown
    };
  } catch (error: any) {
    console.error(`[pdfService] Error converting PDF to markdown for ${filename}:`, error);
    throw error;
  }
}

