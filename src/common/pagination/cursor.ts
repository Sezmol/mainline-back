export interface Cursor {
  createdAt: Date;
  id: string;
}

export const encodeCursor = (row: Cursor) =>
  Buffer.from(`${row.createdAt.toISOString()}|${row.id}`).toString('base64url');

export const decodeCursor = (raw: string): Cursor | null => {
  const [timestamp, id] = Buffer.from(raw, 'base64url').toString().split('|');

  if (!timestamp || !id) return null;

  const createdAt = new Date(timestamp);
  return Number.isNaN(createdAt.getTime()) ? null : { createdAt, id };
};
