import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from '../../lib/s3.js';
import crypto from 'crypto';


export interface presignedUrlResult {
    upLoadUrl: string,
    s3key: string
}

export async function generatePresignedUrl(
    fileName: string,
    contentType: string
): Promise<presignedUrlResult> {
    const Bucket = process.env.AWS_S3_BUCKET?.trim();
    if (!Bucket) {
        throw new Error('AWS_S3_BUCKET environment variable is missing or empty.');
    }
    // Clean filename to remove invalid path characters
    const cleanFilename = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const s3Key = `uploads/${crypto.randomUUID()}-${cleanFilename}`
    const command = new PutObjectCommand({
        Bucket,
        Key: s3Key,
        ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
    return {
        upLoadUrl: uploadUrl,
        s3key: s3Key
    }
}
