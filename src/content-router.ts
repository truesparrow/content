/** Defines the PublicContentRouter and the PrivateContentRouter. */

/** Imports. Also so typedoc works correctly. */
import * as cookieParser from 'cookie-parser'
import { wrap } from 'async-middleware'
import * as compression from 'compression'
import * as HttpStatus from 'http-status-codes'
import * as express from 'express'

import { Env, isLocal } from '@truesparrow/common-js'

import {
    newCommonApiServerMiddleware,
    newCommonServerMiddleware,
    newLocalCommonServerMiddleware,
    Request
} from '@truesparrow/common-server-js'

import { Repository } from './repository'


/** Application level configuration needed in building the content router. */
export interface AppConfig {
    /** The current {@link Env}. */
    env: Env;
    /** A unique name for this service. */
    name: string;
    /**
     * The set of allowed hostnames which can be clients. Will be matched against the Origin header
     * of incoming requests.
     */
    clients: string[];
    /**
     * Disable all logging. Used for tests. Otherwise logs output to the console in {@link Env.Local}
     * and {@link Env.Test} and to loggly in {@link Env.Staging} or {@link Env.Prod}
     */
    forceDisableLogging: boolean;
    /** The secret token for the Loggly logging service. */
    logglyToken: string | null;
    /** The subdomain for the Loggly logging service. */
    logglySubdomain: string | null;
    /** The secret token for the Rollbar error reporting service. */
    rollbarToken: string | null;
}


/**
 * Construct an PublicContentRouter. This is an full formed and independent {@link express.Router}
 * which implements the HTTP API for the public parts of the contente service. It makes the
 * connection between clients, external services and the business logic encapsulated in the
 * {@link Repository}.
 * @note This is meant to be mounted by an express application.
 * @note The router has the following paths exposed:
 *    @path /hello GET
 * @param config - the application configuration.
 * @param repository - a repository.
 * @return An {@link express.Router} doing all of the above.
 */
export function newPublicContentRouter(config: AppConfig, _repository: Repository): express.Router {
    const publicContentRouter = express.Router();

    publicContentRouter.use(cookieParser());
    if (isLocal(config.env)) {
        publicContentRouter.use(newLocalCommonServerMiddleware(config.name, config.env, config.forceDisableLogging));
    } else {
        publicContentRouter.use(newCommonServerMiddleware(
            config.name,
            config.env,
            config.logglyToken as string,
            config.logglySubdomain as string,
            config.rollbarToken as string));
    }
    publicContentRouter.use(compression({ threshold: 0 }));
    publicContentRouter.use(newCommonApiServerMiddleware(config.clients));

    publicContentRouter.get('/hello', wrap(async (_req: Request, res: express.Response) => {
        res.status(HttpStatus.OK);
        res.write(JSON.stringify({ hello: "world" }));
        res.end();
    }));

    return publicContentRouter;
}


/**
 * Construct an PrivateContentRouter. This is an full formed and independent {@link express.Router}
 * which implements the HTTP API for the private parts of the content service. It makes the
 * connection between clients, external services and the business logic encapsulated in the
 * {@link Repository}.
 * @note This is meant to be mounted by an express application.
 * @note The router has the following paths exposed:
 *    @path /hello GET
 * @param config - the application configuration.
 * @param repository - a repository.
 * @return An {@link express.Router} doing all of the above.
 */
export function newPrivateContentRouter(config: AppConfig, _repository: Repository): express.Router {
    const privateContentRouter = express.Router();

    privateContentRouter.use(cookieParser());
    if (isLocal(config.env)) {
        privateContentRouter.use(newLocalCommonServerMiddleware(config.name, config.env, config.forceDisableLogging));
    } else {
        privateContentRouter.use(newCommonServerMiddleware(
            config.name,
            config.env,
            config.logglyToken as string,
            config.logglySubdomain as string,
            config.rollbarToken as string));
    }
    privateContentRouter.use(compression({ threshold: 0 }));
    privateContentRouter.use(newCommonApiServerMiddleware(config.clients));

    privateContentRouter.get('/hello', wrap(async (_req: Request, res: express.Response) => {
        res.status(HttpStatus.OK);
        res.write(JSON.stringify({ hello: "world" }));
        res.end();
    }));

    return privateContentRouter;
}
