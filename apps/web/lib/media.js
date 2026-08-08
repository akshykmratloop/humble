const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

/**
 * Resolves a photo's s3Key to a fetchable URL. Today this always points at
 * the API's dev-only local-disk endpoint (apps/api/src/modules/uploads);
 * once the real S3 adapter ships, photo objects will carry a ready-to-use
 * signed URL instead and this helper collapses to an identity function.
 */
export function photoUrl(s3Key) {
  return `${API_BASE_URL}/v1/uploads/${s3Key}`;
}
