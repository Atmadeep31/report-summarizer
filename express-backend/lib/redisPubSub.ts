import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL;

export const redisPublisher = new Redis(redisUrl, {
    maxRetriesPerRequest: null
})

export function createSubscriber(): Redis {
    return new Redis(redisUrl, {
        maxRetriesPerRequest: null
    })
}

export const getPdfSumamryChannel = (pdfId: string) => {
    return `pdf-summary:${pdfId}`;
}