import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { EvBikesService, CreateBookingDto } from './ev-bikes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@askrev/shared';

@Controller('ev-bikes')
export class EvBikesController {
  constructor(private readonly evBikesService: EvBikesService) {}

  @Get()
  async getAllBikes() {
    return this.evBikesService.getAllBikes();
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-bookings')
  async getMyBookings(@CurrentUser() user: any) {
    return this.evBikesService.getUserBookings(user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS, UserRole.FINANCE_MANAGER)
  @Get('admin/bookings')
  async getAllBookingsAdmin() {
    return this.evBikesService.getAllBookingsAdmin();
  }

  @Get(':id')
  async getBikeById(@Param('id') id: string) {
    return this.evBikesService.getBikeById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('book')
  async bookBike(
    @CurrentUser() user: any,
    @Body() body: CreateBookingDto
  ) {
    return this.evBikesService.createBooking(user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('bookings/:id/cancel')
  async cancelBooking(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body?: { cancellationReason?: string }
  ) {
    return this.evBikesService.cancelBooking(user.id, id, body?.cancellationReason);
  }
}
