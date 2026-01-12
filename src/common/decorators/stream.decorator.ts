import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const StreamResponse = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const response = ctx.switchToHttp().getResponse();
    return response;
  },
);