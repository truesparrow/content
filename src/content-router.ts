/** Defines the PublicContentRouter and the PrivateContentRouter. */

/** Imports. Also so typedoc works correctly. */
import { wrap } from 'async-middleware'
import * as cookieParser from 'cookie-parser'
import * as compression from 'compression'
import * as express from 'express'
import * as HttpStatus from 'http-status-codes'
import { MarshalFrom } from 'raynor'

import { isNotOnServer } from '@truesparrow/common-js'
import {
    newCommonApiServerMiddleware,
    // newCommonServerMiddleware,
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
    PublicEventResponse,
    UpdateEventRequest
} from '@truesparrow/content-sdk-js/dtos'

import { AppConfig } from './app-config'
import { Repository } from './repository'


/**
 * Construct an PublicContentRouter. This is an full formed and independent {@link express.Router}
 * which implements the HTTP API for the public parts of the contente service. It makes the
 * connection between clients, external services and the business logic encapsulated in the
 * {@link Repository}.
 * @note This is meant to be mounted by an express application.
 * @note The router has the following paths exposed:
 *    @path /events?subdomain GET
 * @param config - the application configuration.
 * @param repository - a repository.
 * @param identityClient - a client for the identity service.
 * @return An {@link express.Router} doing all of the above.
 */
export function newPublicContentRouter(config: AppConfig, repository: Repository, identityClient: IdentityClient): express.Router {
    const subDomainMarshaller = new SubDomainMarshaller();
    const publicEventResponseMarshaller = new (MarshalFrom(PublicEventResponse))();

    const publicContentRouter = express.Router();

    publicContentRouter.use(cookieParser());
    if (true || isNotOnServer(config.env)) {
        publicContentRouter.use(newLocalCommonServerMiddleware(config.name, config.env, config.forceDisableLogging));
    } else {
        // publicContentRouter.use(newCommonServerMiddleware(
        //     config.name,
        //     config.env,
        //     config.logglyToken as string,
        //     config.logglySubdomain as string,
        //     config.rollbarToken as string));
    }
    publicContentRouter.use(compression({ threshold: 0 }));
    publicContentRouter.use(newCommonApiServerMiddleware());
    publicContentRouter.use(newSessionMiddleware(SessionLevel.Session, SessionInfoSource.Header, config.env, identityClient));

    publicContentRouter.get('/events', wrap(async (req: Request, res: express.Response) => {
        let subDomain: string | null = null;
        try {
            subDomain = subDomainMarshaller.extract(req.query.subdomain);
        } catch (e) {
            req.log.warn('Could not decode subdomain parameter');
            res.status(HttpStatus.BAD_REQUEST);
            res.end();
            return;
        }

        try {
            const event = await repository.getEventBySubDomain(subDomain as string);

            const publicEventResponse = new PublicEventResponse();
            publicEventResponse.event = event;

            res.write(JSON.stringify(publicEventResponseMarshaller.pack(publicEventResponse)));
            res.status(HttpStatus.OK);
            res.end();
        } catch (e) {
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
 *    @path /check-subdomain-available?subdomain
 * @param config - the application configuration.
 * @param repository - a repository.
 * @param identityClient - a client for the identity service.
 * @param chargebeeClient - a client for Chargebee.
 * @return An {@link express.Router} doing all of the above.
 */
export function newPrivateContentRouter(config: AppConfig, repository: Repository, identityClient: IdentityClient, chargebeeClient: any): express.Router {
    const createEventRequestMarshaller = new (MarshalFrom(CreateEventRequest))();
    const updateEventRequestMarshaller = new (MarshalFrom(UpdateEventRequest))();
    const subDomainMarshaller = new SubDomainMarshaller();
    const privateEventResponseMarshaller = new PrivateEventResponseMarshaller();
    const checkSubDomainAvailableResponseMarshaller = new (MarshalFrom(CheckSubDomainAvailableResponse))();

    const privateContentRouter = express.Router();

    privateContentRouter.use(cookieParser());
    if (true || isNotOnServer(config.env)) {
        privateContentRouter.use(newLocalCommonServerMiddleware(config.name, config.env, config.forceDisableLogging));
    } else {
        // privateContentRouter.use(newCommonServerMiddleware(
        //     config.name,
        //     config.env,
        //     config.logglyToken as string,
        //     config.logglySubdomain as string,
        //     config.rollbarToken as string));
    }
    privateContentRouter.use(compression({ threshold: 0 }));
    privateContentRouter.use(newCommonApiServerMiddleware());
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

        let subscriptionId = '';
        let subscriptionCustomerId = '';

        try {
            const user = req.session.user as User;
            const subscriptionResult = await chargebeeClient.subscription.create({
                plan_id: createEventRequest.plan,
                customer: {
                    email: user.emailAddress,
                    first_name: user.firstName || user.name,
                    last_name: user.lastName || user.name
                }
            }).request();

            subscriptionId = subscriptionResult.subscription.id;
            subscriptionCustomerId = subscriptionResult.subscription.customer_id;
        } catch (e) {
            req.log.error(e);
            res.status(HttpStatus.BAD_GATEWAY);
            res.end();
            return;
        }

        try {
            const event = await repository.createEvent(req.session.user as User, createEventRequest, subscriptionId, subscriptionCustomerId, req.requestTime);

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

    privateContentRouter.delete('/events', wrap(async (req: RequestWithIdentity, res: express.Response) => {
        try {
            const chargebeeIds = await repository.getChargebeeIdsForUser(req.session.user as User);

            if (chargebeeIds != null) {
                await chargebeeClient.subscription.cancel(chargebeeIds.subscriptionId).request();
            }

            await repository.deleteEvent(req.session.user as User, req.requestTime);

            res.status(HttpStatus.OK);
            res.end();
        } catch (e) {
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

    privateContentRouter.put('/events/ui-mark-skipped-setup-wizard', wrap(async (req: RequestWithIdentity, res: express.Response) => {
        try {
            const event = await repository.uiMarkSkippedSetupWizard(req.session.user as User, req.requestTime);

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
            subDomain = subDomainMarshaller.extract(req.query.subdomain);
        } catch (e) {
            console.log(e);
            req.log.warn('Could not decode subdomain parameter');
            res.status(HttpStatus.BAD_REQUEST);
            res.end();
            return;
        }

        try {
            const available = await repository.checkSubDomainAvailable(req.session.user as User, subDomain as string);

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

    privateContentRouter.get('/events/chargebee-management-page-uri', wrap(async (req: RequestWithIdentity, res: express.Response) => {
        try {
            const chargebeeIds = await repository.getChargebeeIdsForUser(req.session.user as User);

            if (chargebeeIds == null) {
                res.status(HttpStatus.NOT_FOUND);
                res.end();
                return;
            }

            const portalSessionResponse = await chargebeeClient.portal_session.create({
                customer: {
                    id: chargebeeIds.customerId
                }
            }).request();

            res.write(JSON.stringify({
                manageAccountUri: portalSessionResponse.portal_session.access_url
            }));
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
