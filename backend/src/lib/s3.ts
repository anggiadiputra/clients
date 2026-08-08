import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import prisma from './prisma';

interface S3Config {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrlBase: string;
}

let cache: { config: S3Config; loadedAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

async function loadConfig(): Promise<S3Config> {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) return cache.config;
  const rows = await prisma.setting.findMany({
    where: { key: { in: ['s3Endpoint', 's3Region', 's3Bucket', 's3AccessKeyId', 's3SecretAccessKey', 's3PublicUrlBase'] } },
  });
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  const cfg: S3Config = {
    endpoint: map.s3Endpoint || '',
    region: map.s3Region || 'auto',
    bucket: map.s3Bucket || '',
    accessKeyId: map.s3AccessKeyId || '',
    secretAccessKey: map.s3SecretAccessKey || '',
    publicUrlBase: map.s3PublicUrlBase || '',
  };
  cache = { config: cfg, loadedAt: Date.now() };
  return cfg;
}

export function invalidateS3ConfigCache() {
  cache = null;
}

export async function getS3Config(): Promise<S3Config> {
  const cfg = await loadConfig();
  if (!cfg.bucket || !cfg.accessKeyId || !cfg.secretAccessKey) {
    throw new Error('S3 belum dikonfigurasi. Atur endpoint/region/bucket/credentials di halaman Settings.');
  }
  return cfg;
}

let clientCache: { cfg: S3Config; client: S3Client } | null = null;

function getClient(cfg: S3Config): S3Client {
  if (clientCache && clientCache.cfg.accessKeyId === cfg.accessKeyId && clientCache.cfg.endpoint === cfg.endpoint) {
    return clientCache.client;
  }
  const client = new S3Client({
    endpoint: cfg.endpoint || undefined,
    region: cfg.region,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    forcePathStyle: !!cfg.endpoint, // required for MinIO/R2 custom endpoints
  });
  clientCache = { cfg, client };
  return client;
}

export function publicUrl(cfg: S3Config, key: string): string {
  if (cfg.publicUrlBase) {
    return `${cfg.publicUrlBase.replace(/\/$/, '')}/${key}`;
  }
  if (cfg.endpoint) {
    return `${cfg.endpoint.replace(/\/$/, '')}/${cfg.bucket}/${key}`;
  }
  return `https://${cfg.bucket}.s3.${cfg.region}.amazonaws.com/${key}`;
}

export async function uploadBuffer(key: string, body: Buffer, contentType: string): Promise<string> {
  const cfg = await getS3Config();
  const client = getClient(cfg);
  await client.send(new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
  return publicUrl(cfg, key);
}

export async function deleteObject(key: string): Promise<void> {
  const cfg = await getS3Config();
  const client = getClient(cfg);
  await client.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
}

export function makeStorageKey(projectId: number, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `projects/${projectId}/${ts}-${rand}-${safe}`;
}
