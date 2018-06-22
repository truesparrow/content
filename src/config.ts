import { config } from 'dotenv'

import { Env, parseEnv } from '@truesparrow/common-js'
import { getFromEnv } from '@truesparrow/common-server-js'

config({ path: 'config/env.content' });

export const ENV: Env = parseEnv(getFromEnv('ENV'));

export const NAME: string = 'content';
export const HOST: string = getFromEnv('HOST');
export const PORT: number = parseInt(getFromEnv('PORT'), 10);
export const ORIGIN: string = `http://${HOST}:${PORT}`;

export const POSTGRES_HOST: string = getFromEnv('POSTGRES_HOST');
export const POSTGRES_PORT: number = parseInt(getFromEnv('POSTGRES_PORT'), 10);
export const POSTGRES_DATABASE: string = getFromEnv('POSTGRES_DATABASE');
export const POSTGRES_USERNAME: string = getFromEnv('POSTGRES_USERNAME');
export const POSTGRES_PASSWORD: string = getFromEnv('POSTGRES_PASSWORD');
export const POSTGRES_MIGRATIONS_DIR: string = getFromEnv('POSTGRES_MIGRATIONS_DIR');
export const POSTGRES_MIGRATIONS_TABLE: string = getFromEnv('POSTGRES_MIGRATIONS_TABLE');

export const IDENTITY_SERVICE_HOST: string = getFromEnv('IDENTITY_SERVICE_HOST');
export const IDENTITY_SERVICE_PORT: number = parseInt(getFromEnv('IDENTITY_SERVICE_PORT'), 10);

export const CHARGEBEE_SITE: string = getFromEnv('CHARGEBEE_SITE');
export const CHARGEBEE_KEY: string = getFromEnv('CHARGEBEE_KEY');
