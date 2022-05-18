export class ResponseError extends Error {

  requestId: string

  constructor(public code: number, public description: string, public status: number, public extra: unknown, requestId: string, public originalError: unknown) {
    super(`code: ${code}, description: ${description}, status: ${status}, extra: ${extra}, requestId: ${requestId} originalError: ${originalError}`);

    this.code = code;
    this.description = description;
    this.status = status;
    this.extra = extra;
    this.requestId = requestId;
    this.originalError = originalError;
  }
}
