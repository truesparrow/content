import { Env, parseEnv, isOnServer } from '@truesparrow/common-js'
import { getFromEnv } from '@truesparrow/common-server-js'

// Common to all services

export const ENV: Env = parseEnv(getFromEnv('COMMON_ENV'));

export const IDENTITY_SERVICE_HOST: string = getFromEnv('COMMON_IDENTITY_SERVICE_HOST');

export const LOGGLY_TOKEN: string | null = isOnServer(ENV) ? getFromEnv('COMMON_LOGGLY_TOKEN') : null;
export const LOGGLY_SUBDOMAIN: string | null = isOnServer(ENV) ? getFromEnv('COMMON_LOGGLY_SUBDOMAIN') : null;
export const ROLLBAR_TOKEN: string | null = isOnServer(ENV) ? getFromEnv('COMMON_ROLLBAR_TOKEN') : null;

// Specific to content service

export const NAME: string = 'content';
export const ADDRESS: string = getFromEnv('CONTENT_ADDRESS');
export const PORT: number = parseInt(getFromEnv('CONTENT_PORT'), 10);
export const ORIGIN: string = getFromEnv('CONTENT_ORIGIN');

export const CLIENTS: string[] = getFromEnv('CONTENT_CLIENTS').split(',');

export const DATABASE_URL: string = getFromEnv('CONTENT_DATABASE_URL');
export const DATABASE_MIGRATIONS_DIR: string = getFromEnv('CONTENT_DATABASE_MIGRATIONS_DIR');
export const DATABASE_MIGRATIONS_TABLE: string = getFromEnv('CONTENT_DATABASE_MIGRATIONS_TABLE');
