export interface Cursor {
  createdAt: Date;
  id: string;
}

const encodeCursor = (row: Cursor) =>
  Buffer.from(`${row.createdAt.toISOString()}|${row.id}`).toString('base64url');

export const decodeCursor = (raw: string) => {
  const [timestamp, id] = Buffer.from(raw, 'base64url').toString().split('|');

  if (!timestamp || !id) return null;

  const createdAt = new Date(timestamp);
  return Number.isNaN(createdAt.getTime()) ? null : { createdAt, id };
};

export const toPage = <T>(
  found: T[],
  limit: number,
  cursorOf: (item: T) => Cursor,
) => {
  const items = found.slice(0, limit);
  const last = items.at(-1);

  return {
    items,
    nextCursor:
      found.length > limit && last ? encodeCursor(cursorOf(last)) : null,
  };
};
