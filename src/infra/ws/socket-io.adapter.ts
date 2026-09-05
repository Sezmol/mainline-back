import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { Server, ServerOptions } from 'socket.io';

export interface SocketIoOptions {
  path: string;
  origins: string[];
}

export class SocketIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly options: SocketIoOptions,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    return super.createIOServer(port, {
      ...options,
      path: this.options.path,
      cors: { origin: this.options.origins, credentials: true },
    }) as Server;
  }
}
