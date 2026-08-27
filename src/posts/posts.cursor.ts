import type { Post, PostCursor } from './posts.types';

export const encodeCursor = (post: Post) =>
  Buffer.from(`${post.createdAt.toISOString()}|${post.id}`).toString(
    'base64url',
  );

export const decodeCursor = (raw: string): PostCursor | null => {
  const [timestamp, id] = Buffer.from(raw, 'base64url').toString().split('|');

  if (!timestamp || !id) return null;

  const createdAt = new Date(timestamp);
  return Number.isNaN(createdAt.getTime()) ? null : { createdAt, id };
};
