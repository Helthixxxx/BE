import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DevicesService } from "./devices.service";
import { DevicesController } from "./devices.controller";
import { Device } from "./entities/device.entity";
import { AuthModule } from "../auth/auth.module";

/**
 * DevicesModule
 * Device(푸시 토큰) 관리 모듈
 */
@Module({
  imports: [TypeOrmModule.forFeature([Device]), AuthModule],
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}
