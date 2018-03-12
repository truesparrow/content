import * as express from 'express'
import * as knex from 'knex'
import 'log-timestamp'

import { InternalWebFetcher, isForDevelopment } from '@truesparrow/common-js'
import { newIdentityClient } from '@truesparrow/identity-sdk-js'

import * as config from './config'
import { newPublicContentRouter, newPrivateContentRouter } from './content-router'
import { Repository } from './repository'
import { newTestRouter } from './test-router'


async function main() {
    const conn = knex({
        client: 'pg',
        connection: config.DATABASE_URL
    });
    const repository = new Repository(conn);
    const identityClient = newIdentityClient(
        config.ENV,
        config.ORIGIN,
        config.IDENTITY_SERVICE_HOST,
        new InternalWebFetcher()
    );

    const appConfig = {
        env: config.ENV,
        name: config.NAME,
        clients: config.CLIENTS,
        forceDisableLogging: false,
        logglyToken: config.LOGGLY_TOKEN,
        logglySubdomain: config.LOGGLY_SUBDOMAIN,
        rollbarToken: config.ROLLBAR_TOKEN
    };

    const publicContentRouter = newPublicContentRouter(appConfig, repository, identityClient);
    const privateContentRouter = newPrivateContentRouter(appConfig, repository, identityClient);
    const testRouter = newTestRouter(appConfig, repository);

    console.log('Starting up');

    console.log('Initializing repository & performing migrations');
    await repository.init();

    console.log('Starting web server');
    const app = express();
    app.disable('x-powered-by');
    app.use('/api/public', publicContentRouter);
    app.use('/api/private', privateContentRouter);
    if (isForDevelopment(config.ENV)) {
        app.use('/test', testRouter);
    }
    app.listen(config.PORT, config.ADDRESS, () => {
        console.log(`Started ${config.NAME} service on ${config.ADDRESS}:${config.PORT}`);
    });
}


main();
