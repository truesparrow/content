/** Defines the PublicContentRouter and the PrivateContentRouter. */

/** Imports. Also so typedoc works correctly. */
import { wrap } from 'async-middleware'
import * as cookieParser from 'cookie-parser'
import * as compression from 'compression'
import * as express from 'express'
import * as HttpStatus from 'http-status-codes'
import { MarshalFrom } from 'raynor'

import { Env, isLocal } from '@truesparrow/common-js'
import {
    newCommonApiServerMiddleware,
    newCommonServerMiddleware,
    newLocalCommonServerMiddleware,
    Request
} from '@truesparrow/common-server-js'
import { IdentityClient, RequestWithIdentity, User } from '@truesparrow/identity-sdk-js'
import {
    newCheckXsrfTokenMiddleware,
    newSessionMiddleware,
    SessionInfoSource,
    SessionLevel
} from '@truesparrow/identity-sdk-js/server'
import {
    SubDomainMarshaller
} from '@truesparrow/content-sdk-js'
import {
    CreateEventRequest,
    CheckSubDomainAvailableResponse,
    PrivateEventResponse,
    PrivateEventResponseMarshaller,
    UpdateEventRequest
} from '@truesparrow/content-sdk-js/dtos'

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
 *    @path /events POST, PUT, GET
 *    @path /check-subdomain-available
 * @param config - the application configuration.
 * @param repository - a repository.
 * @param identityClient - a client for the identity service.
 * @return An {@link express.Router} doing all of the above.
 */
export function newPrivateContentRouter(config: AppConfig, repository: Repository, identityClient: IdentityClient): express.Router {
    const createEventRequestMarshaller = new (MarshalFrom(CreateEventRequest))();
    const updateEventRequestMarshaller = new (MarshalFrom(UpdateEventRequest))();
    const subDomainMarshaller = new SubDomainMarshaller();
    const privateEventResponseMarshaller = new PrivateEventResponseMarshaller();
    const checkSubDomainAvailableResponseMarshaller = new (MarshalFrom(CheckSubDomainAvailableResponse))();

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
    privateContentRouter.use(newSessionMiddleware(SessionLevel.SessionAndUser, SessionInfoSource.Header, config.env, identityClient));

    privateContentRouter.post('/events', [newCheckXsrfTokenMiddleware()], wrap(async (req: RequestWithIdentity, res: express.Response) => {
        let createEventRequest: CreateEventRequest | null = null;
        try {
            createEventRequest = createEventRequestMarshaller.extract(req.body);
        } catch (e) {
            req.log.warn('Could not decode creation request');
            res.status(HttpStatus.BAD_REQUEST);
            res.end();
            return;
        }

        try {
            const event = await repository.createEvent(req.session.user as User, createEventRequest, req.requestTime);

            const privateEventResponse = new PrivateEventResponse();
            privateEventResponse.eventIsRemoved = false;
            privateEventResponse.event = event;

            res.write(JSON.stringify(privateEventResponseMarshaller.pack(privateEventResponse)));
            res.status(HttpStatus.CREATED);
            res.end();
        } catch (e) {
            if (e.name == 'EventAlreadyExistsError') {
                res.status(HttpStatus.CONFLICT);
                res.end();
                return;
            }

            req.log.error(e);
            req.errorLog.error(e);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR);
            res.end();
        }
    }));

    privateContentRouter.put('/events', [newCheckXsrfTokenMiddleware()], wrap(async (req: RequestWithIdentity, res: express.Response) => {
        let updateEventRequest: UpdateEventRequest | null = null;
        try {
            updateEventRequest = updateEventRequestMarshaller.extract(req.body);
        } catch (e) {
            console.log(e);
            req.log.warn('Could not decode update request');
            res.status(HttpStatus.BAD_REQUEST);
            res.end();
            return;
        }

        try {
            const event = await repository.updateEvent(req.session.user as User, updateEventRequest, req.requestTime);

            const privateEventResponse = new PrivateEventResponse();
            privateEventResponse.eventIsRemoved = false;
            privateEventResponse.event = event;

            res.write(JSON.stringify(privateEventResponseMarshaller.pack(privateEventResponse)));
            res.status(HttpStatus.OK);
            res.end();
        } catch (e) {
            if (e.name == 'EventRemovedError') {
                const privateEventResponse = new PrivateEventResponse();
                privateEventResponse.eventIsRemoved = true;
                privateEventResponse.event = null;

                res.write(JSON.stringify(privateEventResponseMarshaller.pack(privateEventResponse)));
                res.status(HttpStatus.OK);
                res.end();
            }

            if (e.name == 'EventNotFoundError') {
                res.status(HttpStatus.NOT_FOUND);
                res.end();
                return;
            }

            if (e.name == 'SubDomainInUseError') {
                res.status(HttpStatus.CONFLICT);
                res.end();
                return;
            }

            req.log.error(e);
            req.errorLog.error(e);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR);
            res.end();
        }
    }));

    privateContentRouter.get('/events', wrap(async (req: RequestWithIdentity, res: express.Response) => {
        try {
            const event = await repository.getEventByUser(req.session.user as User);

            const privateEventResponse = new PrivateEventResponse();
            privateEventResponse.eventIsRemoved = false;
            privateEventResponse.event = event;

            res.write(JSON.stringify(privateEventResponseMarshaller.pack(privateEventResponse)));
            res.status(HttpStatus.OK);
            res.end();
        } catch (e) {
            if (e.name == 'EventRemovedError') {
                const privateEventResponse = new PrivateEventResponse();
                privateEventResponse.eventIsRemoved = true;
                privateEventResponse.event = null;

                res.write(JSON.stringify(privateEventResponseMarshaller.pack(privateEventResponse)));
                res.status(HttpStatus.OK);
                res.end();
            }

            if (e.name == 'EventNotFoundError') {
                res.status(HttpStatus.NOT_FOUND);
                res.end();
                return;
            }

            req.log.error(e);
            req.errorLog.error(e);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR);
            res.end();
        }
    }));

    privateContentRouter.get('/check-subdomain-available', wrap(async (req: RequestWithIdentity, res: express.Response) => {
        let subDomain: string | null = null;
        try {
            subDomain = subDomainMarshaller.extract(req.query.subDomain);
        } catch (e) {
            console.log(e);
            req.log.warn('Could not decode subdomain parameter');
            res.status(HttpStatus.BAD_REQUEST);
            res.end();
            return;
        }

        try {
            const available = await repository.checkSubDomainAvailable(subDomain);

            const checkSubDomainAvailableResponse = new CheckSubDomainAvailableResponse();
            checkSubDomainAvailableResponse.available = available;

            res.write(JSON.stringify(checkSubDomainAvailableResponseMarshaller.pack(checkSubDomainAvailableResponse)));
            res.status(HttpStatus.OK);
            res.end();
        } catch (e) {
            req.log.error(e);
            req.errorLog.error(e);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR);
            res.end();
        }
    }));

    return privateContentRouter;
}
