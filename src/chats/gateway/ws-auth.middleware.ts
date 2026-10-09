import type { JwtService } from '@nestjs/jwt';
import { parseCookie } from 'cookie';
import type { DefaultEventsMap, ExtendedError, Socket } from 'socket.io';
import { ACCESS_COOKIE } from '../../auth/auth.constants';
import type { AccessTokenPayload } from '../../auth/tokens/token.service';
import type { UsersService } from '../../users/users.service';
import type { User } from '../../users/users.types';

export interface SocketData {
  user: User;
  expiresAt: number;
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
    void resolveSession(deps, socket).then((session) => {
      if (!session) return next(new Error('unauthorized'));

      socket.data.user = session.user;
      socket.data.expiresAt = session.expiresAt;
      next();
    });
  };

const resolveSession = async (
  { jwt, users, secret }: WsAuthDeps,
  socket: ChatSocket,
) => {
  const header = socket.handshake.headers.cookie;
  const token = header ? parseCookie(header)[ACCESS_COOKIE] : undefined;

  if (!token) return null;

  try {
    const { sub, exp } = await jwt.verifyAsync<
      AccessTokenPayload & { exp: number }
    >(token, { secret });

    const user = await users.findById(sub);
    return user ? { user, expiresAt: exp * 1000 } : null;
  } catch {
    return null;
  }
};
