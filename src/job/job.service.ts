import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Job, JobStatus, JobResult } from './entities/job.entity';

@Injectable()
export class JobService {
  private jobs: Map<string, Job> = new Map();

  createJob(templateId: string, document: Record<string, any>): Job {
    const job: Job = {
      id: uuidv4(),
      status: JobStatus.PENDING,
      progress: 0,
      templateId,
      document,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.jobs.set(job.id, job);
    return job;
  }

  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  updateJobStatus(jobId: string, status: JobStatus, progress?: number): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = status;
      if (progress !== undefined) {
        job.progress = progress;
      }
      job.updatedAt = new Date();
    }
  }

  updateJobProgress(jobId: string, progress: number): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.progress = progress;
      job.updatedAt = new Date();
    }
  }

  completeJob(jobId: string, result: JobResult): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = JobStatus.COMPLETED;
      job.progress = 100;
      job.result = result;
      job.updatedAt = new Date();
    }
  }

  failJob(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = JobStatus.FAILED;
      job.error = error;
      job.updatedAt = new Date();
    }
  }

  // Cleanup old jobs (call periodically)
  cleanupOldJobs(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    for (const [id, job] of this.jobs) {
      if (now - job.createdAt.getTime() > maxAgeMs) {
        this.jobs.delete(id);
      }
    }
  }
}
