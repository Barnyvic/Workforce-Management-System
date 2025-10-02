import { QueueMessage } from '@/types';

export interface QueueService {
  connect(): Promise<void>;
  publishLeaveRequest(message: QueueMessage): Promise<void>;
  consumeLeaveRequests(
    callback: (message: QueueMessage) => Promise<void>
  ): Promise<void>;
  close(): Promise<void>;
}
