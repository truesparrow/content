import * as express from 'express'
import * as knex from 'knex'
import 'log-timestamp'

import * as config from './config'
import { newPublicContentRouter, newPrivateContentRouter } from './content-router'
import { Repository } from './repository'


async function main() {
    const conn = knex({
        client: 'pg',
        connection: config.DATABASE_URL
    });
    const repository = new Repository(conn);

    const publicContentRouter = newPublicContentRouter({
        env: config.ENV,
        name: config.NAME,
        clients: config.CLIENTS,
        forceDisableLogging: false,
        logglyToken: config.LOGGLY_TOKEN,
        logglySubdomain: config.LOGGLY_SUBDOMAIN,
        rollbarToken: config.ROLLBAR_TOKEN
    }, repository);
    const privateContentRouter = newPrivateContentRouter({
        env: config.ENV,
        name: config.NAME,
        clients: config.CLIENTS,
        forceDisableLogging: false,
        logglyToken: config.LOGGLY_TOKEN,
        logglySubdomain: config.LOGGLY_SUBDOMAIN,
        rollbarToken: config.ROLLBAR_TOKEN
    }, repository);

    console.log('Starting up');

    console.log('Initializing repository & performing migrations');
    await repository.init();

    console.log('Starting web server');
    const app = express();
    app.disable('x-powered-by');
    app.use('/api/public', publicContentRouter);
    app.use('/api/private', privateContentRouter);
    app.listen(config.PORT, config.ADDRESS, () => {
        console.log(`Started ${config.NAME} service on ${config.ADDRESS}:${config.PORT}`);
    });
}


main();
