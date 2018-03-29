import * as express from 'express'
import * as knex from 'knex'
import 'log-timestamp'

import { InternalWebFetcher, isForDevelopment } from '@truesparrow/common-js'
import { newHealthCheckRouter } from '@truesparrow/common-server-js'
import { newIdentityClient } from '@truesparrow/identity-sdk-js'

import * as config from './config'
import { newPublicContentRouter, newPrivateContentRouter } from './content-router'
import { Repository } from './repository'
import { newTestRouter } from './test-router'


async function main() {
    const conn = knex({
        client: 'pg',
        connection: {
            host: config.POSTGRES_HOST,
            port: config.POSTGRES_PORT,
            database: config.POSTGRES_DATABASE,
            user: config.POSTGRES_USERNAME,
            password: config.POSTGRES_PASSWORD
        }
    });
    const repository = new Repository(conn);
    const identityClient = newIdentityClient(
        config.ENV,
        config.ORIGIN,
        `${config.IDENTITY_SERVICE_HOST}:${config.IDENTITY_SERVICE_PORT}`,
        new InternalWebFetcher()
    );

    const appConfig = {
        env: config.ENV,
        name: config.NAME,
        forceDisableLogging: false,
        logglyToken: null,
        logglySubdomain: null,
        rollbarToken: null
    };

    const publicContentRouter = newPublicContentRouter(appConfig, repository, identityClient);
    const privateContentRouter = newPrivateContentRouter(appConfig, repository, identityClient);
    const healthCheckRouter = newHealthCheckRouter();
    const testRouter = newTestRouter(appConfig, repository, identityClient);

    console.log('Starting up');

    console.log('Initializing repository & performing migrations');
    await repository.init();

    console.log('Starting web server');
    const app = express();
    app.disable('x-powered-by');
    app.use('/api/public', publicContentRouter);
    app.use('/api/private', privateContentRouter);
    app.use('/status', healthCheckRouter);
    if (isForDevelopment(config.ENV)) {
        app.use('/test', testRouter);
    }
    app.listen(config.PORT, '0.0.0.0', () => {
        console.log(`Started ${config.NAME} service on ${config.PORT}`);
    });
}


main();
