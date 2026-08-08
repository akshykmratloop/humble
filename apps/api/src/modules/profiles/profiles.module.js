import { Module } from '@nestjs/common';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { PreferencesService } from './preferences.service';
import { PhotosService } from './photos.service';

@Module({
  controllers: [ProfilesController],
  providers: [ProfilesService, PreferencesService, PhotosService],
  exports: [ProfilesService, PreferencesService],
})
export class ProfilesModule {}
