/** Defines {@link Repository}. */

/** Imports. Also so typedoc works correctly. */
import * as knex from 'knex'
import { Marshaller, MarshalFrom, ArrayOf } from 'raynor'
import * as cuid from 'cuid'

import { startupMigration } from '@truesparrow/common-server-js'
import {
    Event,
    EventState,
    PictureSet,
    PictureSetMarshaller,
    SubDomainMarshaller,
    SubEventDetails
} from '@truesparrow/content-sdk-js'
import { CreateEventRequest, UpdateEventRequest } from '@truesparrow/content-sdk-js/dtos'
import { EventEventType } from '@truesparrow/content-sdk-js/events'
import { User } from '@truesparrow/identity-sdk-js'


/** The base class of errors raised by the {@link Repository} and a generic error itself. */
export class RepositoryError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'RepositoryError';
    }
}


/** Error raised when an event could not be found. */
export class EventNotFoundError extends RepositoryError {
    constructor(message: string) {
        super(message);
        this.name = 'EventNotFoundError';
    }
}


/** Error raised when an event could be found, but it has been removed. */
export class EventRemovedError extends RepositoryError {
    constructor(message: string) {
        super(message);
        this.name = 'EventRemovedError';
    }
}


/** Error raised when an event already exists, though it should not. */
export class EventAlreadyExistsError extends RepositoryError {
    constructor(message: string) {
        super(message);
        this.name = 'EventAlreadyExistsError';
    }
}

/** Error raised when a subdomain is already used. */
export class SubDomainInUseError extends RepositoryError {
    constructor(message: string) {
        super(message);
        this.name = 'SubDomainInUseError';
    }
}


const SUB_EVENT_DETAILS_1 = new SubEventDetails();
SUB_EVENT_DETAILS_1.haveEvent = false;
SUB_EVENT_DETAILS_1.address = 'The Marriot';
SUB_EVENT_DETAILS_1.coordinates = [0, 0];
SUB_EVENT_DETAILS_1.dateAndTime = new Date('2019-06-10 10:30 UTC');
const SUB_EVENT_DETAILS_2 = new SubEventDetails();
SUB_EVENT_DETAILS_2.haveEvent = false;
SUB_EVENT_DETAILS_2.address = 'The Marriot';
SUB_EVENT_DETAILS_2.coordinates = [0, 0];
SUB_EVENT_DETAILS_2.dateAndTime = new Date('2019-06-10 14:30 UTC');
const SUB_EVENT_DETAILS_3 = new SubEventDetails();
SUB_EVENT_DETAILS_3.haveEvent = false;
SUB_EVENT_DETAILS_3.address = 'The Marriot';
SUB_EVENT_DETAILS_3.coordinates = [0, 0];
SUB_EVENT_DETAILS_3.dateAndTime = new Date('2019-06-10 19:30 UTC');

/**
 * The final arbiter of business logic and the handler of interactions with the storage engine.
 * @note Each method represents an action which can be done on the entities the content service
 *     operates with. Conversely, no other action can be done on these entities that is not
 *     provided by this class.
 * @note The storage engine is PostgreSQL at the moment. Each entity (post, comment etc) has a
 *     corresponding table. Each also has a corresponding events table. Whenever a mutation
 *     occurs, the fact is recorded in the events table along side the data of the mutation.
 *     Ideally, one would be able to reconstruct the current state in the entity table, by
 *     applying the mutations described in the events table in order.
 */
export class Repository {
    private static readonly _eventPrivateFields = [
        'content.events.id as event_id',
        'content.events.state as event_state',
        'content.events.picture_set as event_picture_set',
        'content.events.subevent_details as event_subevent_details',
        'content.events.user_id as event_user_id',
        'content.events.time_created as event_time_created',
        'content.events.time_last_updated as event_time_last_updated',
        'content.events.current_active_subdomain as event_current_active_subdomain'
    ];

    private readonly _conn: knex;
    private readonly _createEventRequestMarshaller: Marshaller<CreateEventRequest>;
    private readonly _updateEventRequestMarshaller: Marshaller<UpdateEventRequest>;
    private readonly _pictureSetMarshaller: Marshaller<PictureSet>;
    private readonly _subEventDetailsArrayMarshaller: Marshaller<SubEventDetails[]>;
    private readonly _subDomainMarshaller: SubDomainMarshaller;

    /**
     * Construct a repository.
     * @param conn - An open connection to the database.
     */
    constructor(conn: knex) {
        this._conn = conn;
        this._createEventRequestMarshaller = new (MarshalFrom(CreateEventRequest))();
        this._updateEventRequestMarshaller = new (MarshalFrom(UpdateEventRequest))();
        this._pictureSetMarshaller = new PictureSetMarshaller();
        this._subEventDetailsArrayMarshaller = new (ArrayOf(MarshalFrom(SubEventDetails)))();
        this._subDomainMarshaller = new SubDomainMarshaller();
    }

    /** Perform any initialization work on the repository before it can begin serving. */
    async init(): Promise<void> {
        startupMigration();
        await this._conn.schema.raw('set session characteristics as transaction isolation level serializable;');
    }

    /**
     * Create an event for the given user. The resulting event will be in the {@link EventState.Created} state.
     * @param user - the user for which the event is created.
     * @param createEventRequest - details about the event to be created.
     * @param requestTime - the time at which the request was issued to the service. Used to
     *     populate various "modified_at" fields.
     * @return The representation of the newly created event.
     * @throws If the event already exists throws {@link EventAlreadyExistsError}.
     */
    async createEvent(user: User, createEventRequest: CreateEventRequest, requestTime: Date): Promise<Event> {
        let dbId: number = -1;

        const initialPictureSet = new PictureSet();
        initialPictureSet.pictures = [];
        const initialSubEventDetails = [SUB_EVENT_DETAILS_1, SUB_EVENT_DETAILS_2, SUB_EVENT_DETAILS_3];
        const initialSubDomain = cuid();

        try {
            await this._conn.transaction(async (trx) => {
                const dbIds = await trx
                    .from('content.events')
                    .returning('id')
                    .insert({
                        'state': EventState.Created,
                        'picture_set': this._pictureSetMarshaller.pack(initialPictureSet),
                        'subevent_details': {
                            'details': this._subEventDetailsArrayMarshaller.pack(initialSubEventDetails)
                        },
                        'user_id': user.id,
                        'time_created': requestTime,
                        'time_last_updated': requestTime,
                        'time_removed': null,
                        'current_active_subdomain': this._subDomainMarshaller.pack(initialSubDomain)
                    }) as number[];

                dbId = dbIds[0];

                await trx
                    .from('content.event_subdomains')
                    .insert({
                        'state': 'active',
                        'subdomain': initialSubDomain,
                        'event_id': dbId
                    });

                await trx
                    .from('content.event_events')
                    .insert({
                        'type': EventEventType.Created,
                        'timestamp': requestTime,
                        'data': this._createEventRequestMarshaller.pack(createEventRequest),
                        'event_id': dbId
                    });
            });
        } catch (e) {
            if (e.detail.match(/^Key [(]user_id[)]=[(]\d+[)] already exists.$/) != null) {
                throw new EventAlreadyExistsError('Event already exists for user');
            }

            throw e;
        }

        const event = new Event();
        event.id = dbId;
        event.state = EventState.Active;
        event.pictureSet = initialPictureSet;
        event.subEventDetails = [SUB_EVENT_DETAILS_1, SUB_EVENT_DETAILS_2, SUB_EVENT_DETAILS_3];
        event.subDomain = initialSubDomain;
        event.timeCreated = requestTime;
        event.timeLastUpdated = requestTime;

        return event;
    }

    /**
     * Update the event with new properties. If the event is currently in the
     * {@link EventState.Created} state, and the new properties are such that it can be considered
     * {@link EventState.Active}, then that transition is taken care of as well.
     * @param user - the user for which the event is updated.
     * @param updateEventRequest - details about the properties to update.
     * @param requestTime - the time at which the request was issued to the service. Used to
     *     populate various "modified_at" fields.
     * @return The representation of the updated event.
     * @throws If the event does not exist for the user, this will raise {@link EventNotFoundError}.
     * @throws If the event has been removed, this will raise {@link EventRemovedError}.
     */
    async updateEvent(user: User, updateEventRequest: UpdateEventRequest, requestTime: Date): Promise<Event> {
        // TODO: improve typing here.

        const updateDict: any = {
            'time_last_updated': requestTime
        };

        if (updateEventRequest.hasOwnProperty('pictureSet')) {
            updateDict['picture_set'] = this._pictureSetMarshaller.pack(updateEventRequest.pictureSet as PictureSet);
        }

        if (updateEventRequest.hasOwnProperty('subEventDetails')) {
            updateDict['subevent_details'] = {
                'details': this._subEventDetailsArrayMarshaller.pack(
                    updateEventRequest.subEventDetails as SubEventDetails[])
            };
        }

        if (updateEventRequest.hasOwnProperty('subDomain')) {
            updateDict['current_active_subdomain'] = this._subDomainMarshaller.pack(
                updateEventRequest['subDomain'] as string);
        }

        let dbEvent: any | null = null;
        try {
            await this._conn.transaction(async (trx) => {
                const dbEvents = await trx
                    .from('content.events')
                    .where({ user_id: user.id })
                    .returning(Repository._eventPrivateFields)
                    .update(updateDict) as any[];

                if (dbEvents.length == 0) {
                    throw new EventNotFoundError('Event does not exist');
                }

                dbEvent = dbEvents[0];

                if (dbEvent['event_state'] == EventState.Removed) {
                    throw new EventRemovedError('Event exists but is removed');
                }

                if (updateDict.hasOwnProperty('current_active_subdomain')) {
                    await trx
                        .from('content.event_subdomains')
                        .insert({
                            'state': 'active',
                            'subdomain': updateDict['current_active_subdomain'],
                            'event_id': dbEvent['event_id']
                        });
                }

                await trx
                    .from('content.event_events')
                    .insert({
                        'type': EventEventType.Updated,
                        'timestamp': requestTime,
                        'data': this._updateEventRequestMarshaller.pack(updateEventRequest),
                        'event_id': dbEvent['event_id']
                    });

                // Very important: decide if the new version of the event is active or not. This is a
                // react-then-act setup, which is tricky wrt ACID. This _must_ be serializable.
                const event = this._dbEventToEvent(dbEvent);

                if (event.state == EventState.Created && event.doesLookActive) {
                    await trx
                        .from('content.events')
                        .where({ id: event.id })
                        .update({ state: EventState.Active, time_last_updated: requestTime });
                    await trx
                        .from('content.event_events')
                        .insert({
                            'type': EventEventType.Activated,
                            'timestamp': requestTime,
                            'data': null,
                            'event_id': event.id
                        });
                } else if (event.state == EventState.Active && !event.doesLookActive) {
                    await trx
                        .from('content.events')
                        .where({ id: event.id })
                        .update({ state: EventState.Created, time_last_updated: requestTime });
                    await trx
                        .from('content.event_events')
                        .insert({
                            'type': EventEventType.Deactivated,
                            'timestamp': requestTime,
                            'data': null,
                            'event_id': event.id
                        });
                }
            });
        } catch (e) {
            if (e.detail.match(/^Key [(]subdomain[)]=[(][a-z0-9]+[)] already exists.$/) != null) {
                throw new SubDomainInUseError('Subdomain is already in use');
            }

            throw e;
        }

        return this._dbEventToEvent(dbEvent);
    }

    /**
     * Retrieve the event attached to the user.
     * @param user - The user for which the event should be retrieved.
     * @return The representation of the event.
     * @throws If the event does not exist for the user, this will raise {@link EventNotFoundError}.
     * @throws If the event has been removed, this will raise {@link EventRemovedError}.
     */
    async getEventByUser(user: User): Promise<Event> {
        const dbEvents = await this._conn('content.events')
            .select(Repository._eventPrivateFields)
            .where({ user_id: user.id })
            .limit(1);

        if (dbEvents.length == 0) {
            throw new EventNotFoundError('Event does not exist');
        }

        const dbEvent = dbEvents[0];

        if (dbEvent['event_state'] == EventState.Removed) {
            throw new EventRemovedError('Event exists but is removed');
        }

        return this._dbEventToEvent(dbEvent);
    }

    /**
     * Retrieve the event with a given active subdomain.
     * @note Usually there's a single subdomain associated with an event and the event can be looked
     * up there. But sometimes there's two or more, when the user changes the subdomain. There's a
     * propagation delay in DNS, and in order to make sure the event is available, both (or more)
     * subdomains will be kept active until we know to deactivate them. At no point should there
     * be no subdomains active however.
     * @note This does not indicate whether an event has been removed or not,
     * like {@link Repository.getEventByUser}.
     * @param subDomain - The subdomain to search for.
     * @return The representation of the event.
     * @throws If the event does not exist for the subdomain, this will raise {@link EventNotFoundError}.
     */
    async getEventBySubDomain(subDomain: string): Promise<Event> {
        const dbEvents = await this._conn('content.event_subdomains')
            .join('content.events', 'content.events.id', '=', 'content.event_subdomains.event_id')
            .where({
                'content.event_subdomains.subdomain': this._subDomainMarshaller.pack(subDomain),
                state: 'active'
            })
            .select(Repository._eventPrivateFields)
            .limit(1);

        if (dbEvents.length == 0) {
            throw new EventNotFoundError('Event does not exist');
        }

        const dbEvent = dbEvents[0];

        if (dbEvent['event_state'] == EventState.Removed) {
            throw new EventRemovedError('Event exists but is removed');
        }

        return this._dbEventToEvent(dbEvent);
    }

    /**
     * Check whether a subdomain is available for an event or not.
     * @param subDomain - the domain to check.
     * @return Whether the domain is available for grabs ornot.
     */
    async checkSubDomainAvailable(subDomain: string): Promise<boolean> {
        const dbSubDomains = await this._conn('content.event_sudomains')
            .select(['id'])
            .where({ subdomain: this._subDomainMarshaller.pack(subDomain), state: 'active' })
            .limit(1);

        return dbSubDomains.length == 0;
    }

    private _dbEventToEvent(dbEvent: any): Event {
        const event = new Event();
        event.id = dbEvent['event_id'];
        event.state = dbEvent['event_state'];
        event.pictureSet = this._pictureSetMarshaller.extract(dbEvent['event_picture_set']);
        event.subEventDetails = this._subEventDetailsArrayMarshaller.extract(
            dbEvent['event_subevent_details']['details']);
        event.subDomain = this._subDomainMarshaller.extract(
            dbEvent['event_current_active_subdomain']);
        event.timeCreated = new Date(dbEvent['event_time_created']);
        event.timeLastUpdated = new Date(dbEvent['event_time_last_updated']);
        return event;
    }
}
