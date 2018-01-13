import * as express from 'express'
import * as knex from 'knex'

import * as config from './config'
import { newPublicContentRouter, newPrivateContentRouter } from './content-router'
import { Repository } from './repository'


async function main() {
    const conn = knex({
        client: 'pg',
        connection: config.DATABASE_URL
    });

    const repository = new Repository(conn);
    await repository.init();

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


    const app = express();
    app.disable('x-powered-by');
    app.use('/public', publicContentRouter);
    app.use('/private', privateContentRouter);
    app.listen(config.PORT, config.ADDRESS, () => {
        console.log(`Started ${config.NAME} service on ${config.ADDRESS}:${config.PORT}`);
    });
}


main();
