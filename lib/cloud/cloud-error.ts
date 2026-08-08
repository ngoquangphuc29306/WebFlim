export class CloudSyncError extends Error {
  public code?: string;
  public domain?: string;
  public operation?: string;

  constructor(message: string, code?: string, domain?: string, operation?: string) {
    super(message);
    this.name = 'CloudSyncError';
    this.code = code;
    this.domain = domain;
    this.operation = operation;
  }
}
