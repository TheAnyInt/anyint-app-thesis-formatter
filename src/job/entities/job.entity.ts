export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface JobResult {
  pdfPath?: string;
  texPath?: string;
}

export interface Job {
  id: string;
  status: JobStatus;
  progress: number; // 0-100
  templateId: string;
  document: Record<string, any>;
  result?: JobResult;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
