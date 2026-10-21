import { SetMetadata } from '@nestjs/common';

export const ARCJET_PUBLIC_KEY = 'arcjet_public';
export const ArcjetPublic = () => SetMetadata(ARCJET_PUBLIC_KEY, true);
