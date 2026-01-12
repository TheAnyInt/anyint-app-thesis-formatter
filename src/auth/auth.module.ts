import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CasdoorGuard } from './casdoor.guard';

@Module({
  imports: [ConfigModule],
  providers: [CasdoorGuard],
  exports: [CasdoorGuard],
})
export class AuthModule {}
