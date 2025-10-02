declare module 'amqplib' {
  export interface Connection {
    createChannel(): Promise<Channel>;
    close(): Promise<void>;
  }

  export interface Channel {
    assertQueue(queue: string, options?: any): Promise<any>;
    publish(
      exchange: string,
      routingKey: string,
      content: Buffer,
      options?: any
    ): boolean;
    consume(
      queue: string,
      callback: (msg: ConsumeMessage | null) => void
    ): Promise<any>;
    prefetch(count: number): Promise<void>;
    ack(message: ConsumeMessage): void;
    nack(message: ConsumeMessage, allUpTo?: boolean, requeue?: boolean): void;
    close(): Promise<void>;
  }

  export interface ConsumeMessage {
    content: Buffer;
    fields: any;
    properties: any;
  }

  export function connect(url: string): Promise<Connection>;
}
