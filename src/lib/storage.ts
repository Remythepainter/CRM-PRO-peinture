import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

const PRIVATE_BUCKETS = ["documents", "voice-recordings", "project-photos", "work-order-photos"];
const SIGNED_URL_EXPIRY = 3600; // 1 hour

/**
 * Extract the storage path from a full public URL or return as-is if already a path.
 */
export function extractStoragePath(bucket: string, urlOrPath: string): string {
  if (!urlOrPath) return urlOrPath;
  // If it's a full URL, extract the path after /object/public/{bucket}/
  const publicMarker = `/object/public/${bucket}/`;
  const idx = urlOrPath.indexOf(publicMarker);
  if (idx !== -1) {
    return decodeURIComponent(urlOrPath.slice(idx + publicMarker.length));
  }
  return urlOrPath;
}

/**
 * Detect the bucket from a stored URL (for legacy data).
 */
export function detectBucket(url: string): string | null {
  for (const bucket of PRIVATE_BUCKETS) {
    if (url.includes(`/object/public/${bucket}/`) || url.includes(`/object/sign/${bucket}/`)) {
      return bucket;
    }
  }
  return null;
}

/**
 * Get a signed URL for a private bucket file.
 * Handles both legacy full public URLs and plain storage paths.
 */
export async function getSignedUrl(bucket: string, urlOrPath: string): Promise<string> {
  if (!urlOrPath) return urlOrPath;

  // If bucket is not private, return as-is
  if (!PRIVATE_BUCKETS.includes(bucket)) return urlOrPath;

  const path = extractStoragePath(bucket, urlOrPath);
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_EXPIRY);

  if (error || !data?.signedUrl) {
    console.warn(`Failed to sign URL for ${bucket}/${path}:`, error?.message);
    return urlOrPath; // fallback to original
  }
  return data.signedUrl;
}

/**
 * React hook for signed URLs. Handles both legacy public URLs and paths.
 */
export function useSignedUrl(bucket: string, urlOrPath: string | null | undefined): string | null {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!urlOrPath) {
      setSignedUrl(null);
      return;
    }

    if (!PRIVATE_BUCKETS.includes(bucket)) {
      setSignedUrl(urlOrPath);
      return;
    }

    let cancelled = false;
    getSignedUrl(bucket, urlOrPath).then((url) => {
      if (!cancelled) setSignedUrl(url);
    });
    return () => { cancelled = true; };
  }, [bucket, urlOrPath]);

  return signedUrl;
}

/**
 * Hook for signing multiple URLs at once.
 */
export function useSignedUrls(bucket: string, urlsOrPaths: (string | null | undefined)[]): (string | null)[] {
  const [signedUrls, setSignedUrls] = useState<(string | null)[]>([]);

  useEffect(() => {
    if (!urlsOrPaths.length) {
      setSignedUrls([]);
      return;
    }

    if (!PRIVATE_BUCKETS.includes(bucket)) {
      setSignedUrls(urlsOrPaths.map(u => u || null));
      return;
    }

    let cancelled = false;
    Promise.all(
      urlsOrPaths.map(u => u ? getSignedUrl(bucket, u) : Promise.resolve(null))
    ).then(urls => {
      if (!cancelled) setSignedUrls(urls);
    });
    return () => { cancelled = true; };
  }, [bucket, JSON.stringify(urlsOrPaths)]);

  return signedUrls;
}

/**
 * Upload to a bucket and return just the storage path (not public URL).
 */
export async function uploadToStorage(bucket: string, path: string, file: Blob | File, options?: { upsert?: boolean }) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, options);
  if (error) throw error;
  return path; // Return path, not public URL
}
