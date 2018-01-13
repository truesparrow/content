/** Defines {@link Repository}. */

/** Imports. Also so typedoc works correctly. */
import * as knex from 'knex'

import { startupMigration } from '@truesparrow/common-server-js'


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
    private readonly _conn: knex;

    /**
     * Construct a repository.
     * @param conn - An open connection to the database.
     */
    constructor(conn: knex) {
        this._conn = conn;
    }

    /** Perform any initialization work on the repository before it can begin serving. */
    async init(): Promise<void> {
        startupMigration();
        await this._conn.schema.raw('set session characteristics as transaction isolation level serializable;');
    }
}
