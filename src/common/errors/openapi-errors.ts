import type { OpenAPIObject, OperationObject } from '@nestjs/swagger';

const ERROR_REF = '#/components/schemas/ErrorResponse';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

export const attachErrorResponses = (document: OpenAPIObject) => {
  for (const pathItem of Object.values(document.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = (pathItem as Record<string, unknown>)[method] as
        OperationObject | undefined;

      if (!operation) continue;

      operation.responses = {
        ...operation.responses,
        default: {
          description:
            'Something went wrong. The payload is always this shape.',
          content: {
            'application/json': { schema: { $ref: ERROR_REF } },
          },
        },
      };
    }
  }

  return document;
};
