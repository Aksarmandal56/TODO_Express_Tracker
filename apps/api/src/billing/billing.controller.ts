import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  RawBodyRequest,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create Stripe checkout session' })
  createCheckoutSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { priceId: string; plan: 'pro_monthly' | 'pro_yearly' },
  ) {
    return this.billingService.createCheckoutSession(user.userId, body.priceId, body.plan);
  }

  @Post('portal')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create Stripe billing portal session' })
  createPortalSession(@CurrentUser() user: AuthenticatedUser) {
    return this.billingService.createPortalSession(user.userId);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current subscription status' })
  getStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.billingService.getSubscriptionStatus(user.userId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook handler' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) return { received: false };
    await this.billingService.handleWebhook(rawBody, signature);
    return { received: true };
  }
}
