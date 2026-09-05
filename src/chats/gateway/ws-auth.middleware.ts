import type { JwtService } from '@nestjs/jwt';
import { parseCookie } from 'cookie';
import type { DefaultEventsMap, ExtendedError, Socket } from 'socket.io';
import { ACCESS_COOKIE } from '../../auth/auth.constants';
import type { AccessTokenPayload } from '../../auth/tokens/token.service';
import type { UsersService } from '../../users/users.service';
import type { User } from '../../users/users.types';

export interface SocketData {
  user: User;
}

export type ChatSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  SocketData
>;

export interface WsAuthDeps {
  jwt: JwtService;
  users: UsersService;
  secret: string;
}

export const wsAuth =
  (deps: WsAuthDeps) =>
  (socket: ChatSocket, next: (error?: ExtendedError) => void): void => {
    void resolveUser(deps, socket).then((user) => {
      if (!user) return next(new Error('unauthorized'));

      socket.data.user = user;
      next();
    });
  };

const resolveUser = async (
  { jwt, users, secret }: WsAuthDeps,
  socket: ChatSocket,
) => {
  const header = socket.handshake.headers.cookie;
  const token = header ? parseCookie(header)[ACCESS_COOKIE] : undefined;

  if (!token) return null;

  try {
    const { sub } = await jwt.verifyAsync<AccessTokenPayload>(token, {
      secret,
    });
    return await users.findById(sub);
  } catch {
    return null;
  }
};
