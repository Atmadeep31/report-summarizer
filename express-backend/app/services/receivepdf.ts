import { s3Client } from "../../lib/s3.js";
import { GetObjectCommand, S3ServiceException } from '@aws-sdk/client-s3';

export async function getPdfFromS3(s3Key: string): Promise<{ buffer: Buffer, s3key: string }> {
    const Bucket = process.env.AWS_S3_BUCKET?.trim();
    try {
        if (!Bucket) {
            throw new Error("no Bucket found");
        }
        const command = new GetObjectCommand({
            Bucket: Bucket,
            Key: s3Key
        })
        const res = await s3Client.send(command)
        const byteArray = await res.Body?.transformToByteArray();
        const buff = Buffer.from(byteArray!)

        return {
            buffer: buff,
            s3key: s3Key
        }

    } catch (error) {
        console.log(error)
        throw error;
    }
}