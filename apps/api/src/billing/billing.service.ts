import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { User, UserDocument, SubscriptionPlan } from '../auth/schemas/user.schema';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private stripe: Stripe;

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>('stripe.secretKey') || '',
      { apiVersion: '2024-04-10' },
    );
  }

  async createCheckoutSession(userId: string, priceId: string, plan: 'pro_monthly' | 'pro_yearly') {
    const user = await this.userModel.findById(userId);
    if (!user) throw new BadRequestException('User not found');

    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user._id.toString() },
      });
      customerId = customer.id;
      await this.userModel.findByIdAndUpdate(userId, { stripeCustomerId: customerId });
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${this.configService.get('frontendUrl')}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.configService.get('frontendUrl')}/billing/cancel`,
      metadata: { userId, plan },
    });

    return { url: session.url, sessionId: session.id };
  }

  async createPortalSession(userId: string): Promise<{ url: string }> {
    const user = await this.userModel.findById(userId);
    if (!user?.stripeCustomerId) throw new BadRequestException('No billing account found');

    const session = await this.stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${this.configService.get('frontendUrl')}/settings/billing`,
    });

    return { url: session.url };
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = this.configService.get<string>('stripe.webhookSecret');
    if (!webhookSecret) {
      this.logger.warn('Stripe webhook secret not configured');
      return;
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      throw new BadRequestException(`Webhook signature verification failed: ${(err as Error).message}`);
    }

    this.logger.log(`Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionChange(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionDeleted(subscription);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        this.logger.warn(`Payment failed for customer: ${invoice.customer}`);
        break;
      }
    }
  }

  private async handleSubscriptionChange(subscription: Stripe.Subscription): Promise<void> {
    const customerId = subscription.customer as string;
    const status = subscription.status;
    const plan = status === 'active' ? SubscriptionPlan.PRO : SubscriptionPlan.FREE;

    await this.userModel.findOneAndUpdate(
      { stripeCustomerId: customerId },
      { subscription: plan, stripeSubscriptionId: subscription.id },
    );
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const customerId = subscription.customer as string;
    await this.userModel.findOneAndUpdate(
      { stripeCustomerId: customerId },
      { subscription: SubscriptionPlan.FREE, stripeSubscriptionId: null },
    );
  }

  async getSubscriptionStatus(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new BadRequestException('User not found');

    return {
      plan: user.subscription,
      stripeCustomerId: user.stripeCustomerId,
      hasSubscription: !!user.stripeSubscriptionId,
    };
  }
}
