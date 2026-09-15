import { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { createSubscriber, getPdfSumamryChannel } from "../../lib/redisPubSub.js";

export async function streamPdfSummary(req: Request, res: Response) {
    // Sanitize pdfId by stripping any leading colon (e.g. if user types :uuid in URL)
    const rawPdfId = req.params.pdfId;
    const pdfId = typeof rawPdfId === 'string' ? rawPdfId.replace(/^:/, '').trim() : undefined;

    if (!pdfId) {
        res.status(400).json({ error: 'pdfId is required' });
        return;
    }

    // 1. Initialize SSE Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ status: 'CONNECTED', message: 'Listening for summary...' })}\n\n`);

    // 2. Setup heartbeat interval (every 20s)
    const heartbeat = setInterval(() => {
        res.write(':heartbeat\n\n');
    }, 20000);

    // 3. Redis Pub/Sub setup & cleanup logic
    const subscriber = createSubscriber();
    const channelName = getPdfSumamryChannel(pdfId);
    let iscleanedup = false;

    const cleanup = async () => {
        if (iscleanedup) return;
        iscleanedup = true;
        clearInterval(heartbeat);
        try {
            await subscriber.unsubscribe(channelName);
            await subscriber.quit();
        } catch (err) {
            console.error('Error cleaning up Redis subscriber:', err);
        }
    };

    // 4. Register message handler FIRST (before calling subscribe)
    subscriber.on('message', async (channel, message) => {
        if (channel !== channelName) return;

        try {
            const data = JSON.parse(message);

            if (data.status === 'Completed') {
                const finalSummary = await prisma.fullSummary.findUnique({
                    where: { pdf_id: pdfId }
                });

                res.write(`data: ${JSON.stringify({
                    success: true,
                    status: 'Completed',
                    message: 'Summary generated successfully',
                    summary: finalSummary?.summary
                })}\n\n`);

                await cleanup();
                res.end();
            } 
            else if (data.status === 'Failure') {
                res.write(`data: ${JSON.stringify({
                    success: false,
                    status: 'Failure',
                    message: 'Summary generation failed'
                })}\n\n`);

                await cleanup();
                res.end();
            }
        } catch (error: any) {
            res.write(`data: ${JSON.stringify({ status: 'ERROR', error: error.message })}\n\n`);
            await cleanup();
            res.end();
        }
    });

    // 5. Subscribe to Redis FIRST
    await subscriber.subscribe(channelName);

    // 6. Check DB SECOND (after subscription is active)
    try {
        const existingSummary = await prisma.fullSummary.findUnique({
            where: { pdf_id: pdfId }
        });

        if (existingSummary) {
            res.write(`data: ${JSON.stringify({
                success: true,
                status: 'Completed',
                message: 'Retrieved summary from database cache',
                summary: existingSummary.summary
            })}\n\n`);

            await cleanup();
            res.end();
            return;
        }
    } catch (dbError: any) {
        console.error('DB check error in sseController:', dbError);
        res.write(`data: ${JSON.stringify({ status: 'ERROR', error: dbError.message })}\n\n`);
        await cleanup();
        res.end();
        return;
    }

    req.on('close', async () => {
        await cleanup();
    });
}