import {
  Body,
  Controller,
  Dependencies,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  registerSchema,
  loginSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
} from '@humble/validation';
import { z } from 'zod';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { applyParamDecorators } from '../../common/decorators/apply-params';
import { AuthService } from './auth.service';

const verifyEmailSchema = z.object({ token: z.string().min(1) });

@Controller('v1/auth')
@Dependencies(AuthService)
export class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  @Post('register')
  @HttpCode(202)
  @UsePipes(new ZodValidationPipe(registerSchema))
  async register(body) {
    const result = await this.authService.register(body);
    const devOnly =
      process.env.NODE_ENV !== 'production' ? { verificationToken: result.verificationToken } : {};
    return { message: 'If that email is valid, a verification link has been sent.', ...devOnly };
  }

  @Post('verify-email')
  @UsePipes(new ZodValidationPipe(verifyEmailSchema))
  async verifyEmail(body) {
    await this.authService.verifyEmail(body.token);
    return { message: 'Email verified' };
  }

  @Post('login')
  @UsePipes(new ZodValidationPipe(loginSchema))
  async login(body, req) {
    const user = await this.authService.login(body);
    await new Promise((resolve, reject) => {
      req.session.regenerate((err) => (err ? reject(err) : resolve()));
    });
    req.session.userId = user.id;
    req.session.role = user.role;
    return { id: user.id, role: user.role };
  }

  @Post('logout')
  @UseGuards(SessionAuthGuard)
  @HttpCode(204)
  async logout(req, res) {
    await new Promise((resolve, reject) => {
      req.session.destroy((err) => (err ? reject(err) : resolve()));
    });
    res.clearCookie('humble_sid');
  }

  @Post('password-reset/request')
  @HttpCode(202)
  @UsePipes(new ZodValidationPipe(passwordResetRequestSchema))
  async requestPasswordReset(body) {
    await this.authService.requestPasswordReset(body.email);
    return { message: 'If that email is registered, a reset link has been sent.' };
  }

  @Post('password-reset/confirm')
  @UsePipes(new ZodValidationPipe(passwordResetConfirmSchema))
  async confirmPasswordReset(body) {
    await this.authService.confirmPasswordReset(body.token, body.newPassword);
    return { message: 'Password updated' };
  }

  @Get('session')
  @UseGuards(SessionAuthGuard)
  async session(req) {
    return { userId: req.currentUserId, role: req.currentUserRole };
  }
}

applyParamDecorators(AuthController, 'register', [Body()]);
applyParamDecorators(AuthController, 'verifyEmail', [Body()]);
applyParamDecorators(AuthController, 'login', [Body(), Req()]);
applyParamDecorators(AuthController, 'logout', [Req(), Res({ passthrough: true })]);
applyParamDecorators(AuthController, 'requestPasswordReset', [Body()]);
applyParamDecorators(AuthController, 'confirmPasswordReset', [Body()]);
applyParamDecorators(AuthController, 'session', [Req()]);
