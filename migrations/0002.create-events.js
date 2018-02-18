exports.up = (knex, Promise) => knex.schema.raw(`
    CREATE TABLE content.events (
        -- Primary key
        id Serial,
        PRIMARY KEY (id),
        -- Core properties
        state SmallInt NOT NULL,
        picture_set Jsonb NOT NULL,
        subevent_details Jsonb NOT NULL,
        -- Foreign key to external systems
        user_id Int NOT NULL,
        -- Denormalized data
        time_created Timestamp NOT NULL,
        time_last_updated Timestamp NOT NULL,
        time_removed Timestamp NULL,
        current_active_subdomain varchar(64) NOT NULL
    );

    CREATE UNIQUE INDEX events_user_id ON content.events(user_id);
`);

exports.down = (knex, Promise) => knex.schema.raw(`
    DROP INDEX IF EXISTS content.events_user_id;
    DROP TABLE IF EXISTS content.events;
`);
