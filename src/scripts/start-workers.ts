#!/usr/bin/env node

/**
 * Script to start multiple queue workers for scalability
 * 
 * This script spawns multiple worker processes to handle queue processing
 * in parallel, improving throughput and fault tolerance.
 * 
 * Usage:
 * - Default (2 workers): npm run workers
 * - Custom count: npm run workers -- --count=5
 * - With environment: NODE_ENV=production npm run workers -- --count=4
 */

import { spawn, ChildProcess } from 'child_process';
import { logger } from '@/services/logger.service';

interface WorkerProcess {
  id: string;
  process: ChildProcess;
  startTime: Date;
  restartCount: number;
}

class WorkerManager {
  private workers: Map<string, WorkerProcess> = new Map();
  private workerCount: number;
  private isShuttingDown = false;
  private maxRestarts = 5;
  private restartDelay = 5000;

  constructor(workerCount: number = 2) {
    this.workerCount = workerCount;
  }

  async start(): Promise<void> {
    logger.info(`Starting ${this.workerCount} queue workers...`);

    for (let i = 1; i <= this.workerCount; i++) {
      await this.startWorker(i);
    }

    process.on('SIGTERM', this.gracefulShutdown.bind(this));
    process.on('SIGINT', this.gracefulShutdown.bind(this));

    logger.info(`Worker manager started with ${this.workerCount} workers`);
    logger.info('Press Ctrl+C to stop all workers');
  }

  private async startWorker(workerId: number): Promise<void> {
    const id = `worker-${workerId}`;
    
    if (this.workers.has(id)) {
      logger.warn(`Worker ${id} already exists, skipping...`);
      return;
    }

    try {
      const workerProcess = spawn('node', ['-r', 'ts-node/register', '-r', 'tsconfig-paths/register', 'src/workers/queue-worker.ts'], {
        stdio: ['inherit', 'inherit', 'inherit'],
        env: {
          ...process.env,
          WORKER_ID: id,
        },
      });

      const worker: WorkerProcess = {
        id,
        process: workerProcess,
        startTime: new Date(),
        restartCount: 0,
      };

      this.workers.set(id, worker);

      workerProcess.on('exit', (code, signal) => {
        this.handleWorkerExit(worker, code, signal);
      });

      workerProcess.on('error', (error) => {
        logger.error(`Worker ${id} error:`, error);
      });

      logger.info(`Started worker ${id} (PID: ${workerProcess.pid})`);
    } catch (error) {
      logger.error(`Failed to start worker ${id}:`, error);
    }
  }

  private handleWorkerExit(worker: WorkerProcess, code: number | null, signal: string | null): void {
    this.workers.delete(worker.id);

    if (this.isShuttingDown) {
      logger.info(`Worker ${worker.id} stopped during shutdown`);
      return;
    }

    logger.warn(`Worker ${worker.id} exited with code ${code}, signal ${signal}`);

    if (worker.restartCount < this.maxRestarts) {
      worker.restartCount++;
      logger.info(`Restarting worker ${worker.id} (attempt ${worker.restartCount}/${this.maxRestarts})`);
      
      setTimeout(() => {
        if (!this.isShuttingDown) {
          this.restartWorker(worker);
        }
      }, this.restartDelay);
    } else {
      logger.error(`Worker ${worker.id} exceeded max restart attempts (${this.maxRestarts})`);
    }
  }

  private async restartWorker(worker: WorkerProcess): Promise<void> {
    const workerId = parseInt(worker.id.split('-')[1] || '1');
    await this.startWorker(workerId);
  }

  private async gracefulShutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.info('Shutting down all workers...');

    const shutdownPromises = Array.from(this.workers.values()).map(worker => {
      return new Promise<void>((resolve) => {
        worker.process.on('exit', () => resolve());
        worker.process.kill('SIGTERM');
        
        setTimeout(() => {
          if (!worker.process.killed) {
            worker.process.kill('SIGKILL');
          }
          resolve();
        }, 10000);
      });
    });

    await Promise.all(shutdownPromises);
    logger.info('All workers stopped');
    process.exit(0);
  }

  getWorkerStatus(): { total: number; running: number; workers: Array<{ id: string; pid: number | undefined; uptime: number; restarts: number }> } {
    const workers = Array.from(this.workers.values()).map(worker => ({
      id: worker.id,
      pid: worker.process.pid,
      uptime: Date.now() - worker.startTime.getTime(),
      restarts: worker.restartCount,
    }));

    return {
      total: this.workerCount,
      running: this.workers.size,
      workers,
    };
  }
}

const args = process.argv.slice(2);
const countArg = args.find(arg => arg.startsWith('--count='));
const workerCount = countArg ? parseInt(countArg.split('=')[1] || '2') : 2;

if (isNaN(workerCount) || workerCount < 1 || workerCount > 10) {
  logger.error('Invalid worker count. Must be between 1 and 10.');
  process.exit(1);
}

if (require.main === module) {
  const manager = new WorkerManager(workerCount);
  manager.start().catch((error) => {
    logger.error('Failed to start worker manager:', error);
    process.exit(1);
  });
}

export { WorkerManager };
