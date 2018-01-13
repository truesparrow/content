import { expect } from 'chai'
import * as knex from 'knex'
import 'mocha'

import * as config from './config'
import { Repository } from './repository'


describe('Repository', () => {
    let conn: knex | null;

    before('create connection', () => {
        conn = knex({
            client: 'pg',
            connection: config.DATABASE_URL,
            pool: {
                min: 0,
                max: 10
            },
            acquireConnectionTimeout: 1000
        });
    });

    before('run initialization once', async () => {
        const theConn = conn as knex;
        const repository = new Repository(theConn);
        await repository.init();
    });

    after('destroy connection', () => {
        (conn as knex).destroy();
    });

    afterEach('clear out database', () => {
        // const theConn = conn as knex;
        // TODO: delete entities here
    });

    it('can be created', () => {
        const repository = new Repository(conn as knex);
        expect(repository).is.not.null;
    });
});
