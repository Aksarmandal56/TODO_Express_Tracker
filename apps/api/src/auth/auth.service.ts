import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
  role: string;
  subscription: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 12;

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: AuthUser; tokens: TokenPair }> {
    const existing = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);
    const user = await this.userModel.create({
      name: dto.name,
      email: dto.email.toLowerCase(),
      password: hashedPassword,
    });

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user._id.toString(), tokens.refreshToken);

    this.logger.log(`New user registered: ${user.email}`);
    return { user: this.sanitizeUser(user), tokens };
  }

  async login(dto: LoginDto): Promise<{ user: AuthUser; tokens: TokenPair }> {
    const user = await this.userModel.findOne({ email: dto.email.toLowerCase() }).select('+password');
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user._id.toString(), tokens.refreshToken);

    user.lastLoginAt = new Date();
    await user.save();

    this.logger.log(`User logged in: ${user.email}`);
    return { user: this.sanitizeUser(user), tokens };
  }

  async refreshTokens(userId: string, refreshToken: string): Promise<TokenPair> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const tokenMatches = await Promise.all(
      user.refreshTokens.map((t) => bcrypt.compare(refreshToken, t)),
    );

    if (!tokenMatches.some(Boolean)) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(user);
    // Replace old refresh token with new one
    const hashedOldToken = user.refreshTokens.find(async (t) => await bcrypt.compare(refreshToken, t));
    user.refreshTokens = user.refreshTokens.filter((t) => t !== hashedOldToken);
    await this.storeRefreshToken(userId, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) return;

    const remaining: string[] = [];
    for (const t of user.refreshTokens) {
      const matches = await bcrypt.compare(refreshToken, t);
      if (!matches) remaining.push(t);
    }
    user.refreshTokens = remaining;
    await user.save();
  }

  async validateUser(userId: string): Promise<UserDocument | null> {
    return this.userModel.findById(userId).exec();
  }

  private async generateTokens(user: UserDocument): Promise<TokenPair> {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      subscription: user.subscription,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get<string>('jwt.expiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const hashed = await bcrypt.hash(refreshToken, this.SALT_ROUNDS);
    await this.userModel.findByIdAndUpdate(userId, {
      $push: { refreshTokens: hashed },
    });
  }

  private sanitizeUser(user: UserDocument): AuthUser {
    return {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      subscription: user.subscription,
    };
  }
}
