import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardService } from './dashboard/dashboard.service';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
import { StoresController } from './stores/stores.controller';
import { StoresService } from './stores/stores.service';
import { ProductsController } from './products/products.controller';
import { ProductsService } from './products/products.service';
import { OrdersController } from './orders/orders.controller';
import { OrdersService } from './orders/orders.service';
import { VerificationController } from './verification/verification.controller';

@Module({
  controllers: [
    DashboardController,
    UsersController,
    StoresController,
    ProductsController,
    OrdersController,
    VerificationController,
  ],
  providers: [
    DashboardService,
    UsersService,
    StoresService,
    ProductsService,
    OrdersService,
  ],
})
export class AdminModule {}
