import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GatewayProxyService } from './gateway-proxy.service';

@Module({
  imports: [HttpModule],
  providers: [GatewayProxyService],
  exports: [GatewayProxyService],
})
export class GatewayModule {}
