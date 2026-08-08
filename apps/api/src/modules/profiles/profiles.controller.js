import {
  Body,
  Controller,
  Dependencies,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { z } from 'zod';
import {
  profileUpdateSchema,
  preferenceUpdateSchema,
  reorderPhotosSchema,
  birthdateSchema,
  genderEnum,
} from '@humble/validation';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { applyParamDecorators } from '../../common/decorators/apply-params';
import { ProfilesService } from './profiles.service';
import { PreferencesService } from './preferences.service';
import { PhotosService } from './photos.service';

const profileCreateOrUpdateSchema = profileUpdateSchema.extend({
  birthdate: birthdateSchema.optional(),
  gender: genderEnum.optional(),
});

const photoIdParamSchema = z.object({ id: z.string().uuid() });

@Controller('v1')
@UseGuards(SessionAuthGuard)
@Dependencies(ProfilesService, PreferencesService, PhotosService)
export class ProfilesController {
  constructor(profilesService, preferencesService, photosService) {
    this.profilesService = profilesService;
    this.preferencesService = preferencesService;
    this.photosService = photosService;
  }

  @Get('profiles/me')
  async getOwn(req) {
    return this.profilesService.getOwn(req.currentUserId);
  }

  @Patch('profiles/me')
  @UsePipes(new ZodValidationPipe(profileCreateOrUpdateSchema))
  async updateOwn(body, req) {
    return this.profilesService.createOrUpdateOwn(req.currentUserId, body);
  }

  @Get('profiles/:id')
  async getPublic(id, req) {
    return this.profilesService.getPublicView(id, req.currentUserId);
  }

  @Get('preferences/me')
  async getPreferences(req) {
    return this.preferencesService.getOwn(req.currentUserId);
  }

  @Patch('preferences/me')
  @UsePipes(new ZodValidationPipe(preferenceUpdateSchema))
  async updatePreferences(body, req) {
    return this.preferencesService.updateOwn(req.currentUserId, body);
  }

  @Post('profiles/me/photos/upload-url')
  async requestPhotoUploadUrl(req) {
    return this.photosService.requestUploadUrl(req.currentUserId);
  }

  @Post('profiles/me/photos/:id/confirm')
  async confirmPhotoUpload(params, req) {
    return this.photosService.confirmUpload(req.currentUserId, params.id);
  }

  @Patch('profiles/me/photo-order')
  @UsePipes(new ZodValidationPipe(reorderPhotosSchema))
  async reorderPhotos(body, req) {
    await this.photosService.reorder(req.currentUserId, body.orderedPhotoIds);
    return { message: 'Photo order updated' };
  }

  @Delete('profiles/me/photos/:id')
  async deletePhoto(params, req) {
    await this.photosService.remove(req.currentUserId, params.id);
    return { message: 'Photo deleted' };
  }
}

applyParamDecorators(ProfilesController, 'getOwn', [Req()]);
applyParamDecorators(ProfilesController, 'updateOwn', [Body(), Req()]);
applyParamDecorators(ProfilesController, 'getPublic', [Param('id'), Req()]);
applyParamDecorators(ProfilesController, 'getPreferences', [Req()]);
applyParamDecorators(ProfilesController, 'updatePreferences', [Body(), Req()]);
applyParamDecorators(ProfilesController, 'requestPhotoUploadUrl', [Req()]);
applyParamDecorators(ProfilesController, 'confirmPhotoUpload', [
  Param(new ZodValidationPipe(photoIdParamSchema)),
  Req(),
]);
applyParamDecorators(ProfilesController, 'reorderPhotos', [Body(), Req()]);
applyParamDecorators(ProfilesController, 'deletePhoto', [
  Param(new ZodValidationPipe(photoIdParamSchema)),
  Req(),
]);
