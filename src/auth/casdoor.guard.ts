import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class CasdoorGuard implements CanActivate {
  private readonly logger = new Logger(CasdoorGuard.name);
  private jwksClient: JwksClient;

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {
    const jwksUri =
      this.configService.get<string>('CASDOOR_JWKS_JSON') ||
      'http://localhost:8000/.well-known/jwks';

    this.jwksClient = new JwksClient({
      jwksUri,
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
    });

    this.logger.log(`Casdoor JWKS Client initialized with: ${jwksUri}`);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Authorization token is required');
    }

    try {
      // Decode token to get kid
      const decodedToken = jwt.decode(token, { complete: true }) as any;

      if (!decodedToken?.header?.kid) {
        throw new UnauthorizedException('Invalid token format');
      }

      // Get public key and verify
      const key = await this.getSigningKey(decodedToken.header.kid);
      const signingKey = key.getPublicKey();

      const payload = jwt.verify(token, signingKey, {
        algorithms: ['RS256'],
      }) as any;

      if (!payload.sub) {
        throw new UnauthorizedException('Invalid token: missing sub');
      }

      // Attach minimal user info to request (for logging/debugging)
      request.user = {
        sub: payload.sub,
        name: payload.name,
        email: payload.email,
      };

      // Token is valid, will be forwarded to Gateway by controller
      this.logger.debug(`JWT validated for user: ${payload.sub}`);
      return true;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token signature');
      } else if (error instanceof jwt.NotBeforeError) {
        throw new UnauthorizedException('Token not active');
      } else if (error instanceof UnauthorizedException) {
        throw error;
      } else {
        this.logger.error(`JWT verification failed: ${error.message}`);
        throw new UnauthorizedException('Token validation failed');
      }
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private getSigningKey(kid: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.jwksClient.getSigningKey(kid, (err, key) => {
        if (err) {
          reject(new UnauthorizedException('Failed to get signing key'));
        } else {
          resolve(key);
        }
      });
    });
  }
}
