import { Env, parseEnv, isOnServer } from '@truesparrow/common-js'
import { getFromEnv } from '@truesparrow/common-server-js'

export const NAME: string = 'content';
export const ENV: Env = parseEnv(getFromEnv('ENV'));
export const ADDRESS: string = getFromEnv('ADDRESS');
export const PORT: number = parseInt(getFromEnv('PORT'), 10);
export const DATABASE_URL: string = getFromEnv('DATABASE_URL');
export const DATABASE_MIGRATIONS_DIR: string = getFromEnv('DATABASE_MIGRATIONS_DIR');
export const DATABASE_MIGRATIONS_TABLE: string = getFromEnv('DATABASE_MIGRATIONS_TABLE');
export const ORIGIN: string = getFromEnv('ORIGIN');
export const CLIENTS: string[] = getFromEnv('CLIENTS').split(',');
export const IDENTITY_SERVICE_HOST: string = getFromEnv('IDENTITY_SERVICE_HOST');

export let LOGGLY_TOKEN: string | null;
export let LOGGLY_SUBDOMAIN: string | null;
export let ROLLBAR_TOKEN: string | null;

if (isOnServer(ENV)) {
    LOGGLY_TOKEN = getFromEnv('LOGGLY_TOKEN');
    LOGGLY_SUBDOMAIN = getFromEnv('LOGGLY_SUBDOMAIN');
    ROLLBAR_TOKEN = getFromEnv('ROLLBAR_TOKEN');
} else {
    LOGGLY_TOKEN = null;
    LOGGLY_SUBDOMAIN = null;
    ROLLBAR_TOKEN = null;
}
