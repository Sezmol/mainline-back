const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';

interface PostgresError {
  code: string;
  constraint?: string;
  detail?: string;
}

const asPostgresError = (error: unknown) => {
  if (typeof error !== 'object' || error === null) return undefined;
  const candidate = error as { code?: unknown; driverError?: unknown };
  return (candidate.code ? candidate : candidate.driverError) as
    PostgresError | undefined;
};

export const asUniqueViolation = (error: unknown) => {
  const source = asPostgresError(error);
  return source?.code === UNIQUE_VIOLATION ? source : null;
};

export const asForeignKeyViolation = (error: unknown) => {
  const source = asPostgresError(error);
  return source?.code === FOREIGN_KEY_VIOLATION ? source : null;
};
