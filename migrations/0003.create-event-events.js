exports.up = (knex, Promise) => knex.schema.raw(`
    CREATE TABLE content.event_events (
        -- Primary key
        id Serial,
        PRIMARY KEY (id),
        -- Core properties
        type SmallInt NOT NULL,
        timestamp Timestamp NOT NULL,
        data Jsonb NULL,
        -- Foreign key
        event_id Int NOT NULL REFERENCES content.events(id)
    );

    CREATE INDEX event_events_event_id ON content.event_events(event_id);
`);

exports.down = (knex, Promise) => knex.schema.raw(`
    DROP INDEX IF EXISTS content.event_events_event_id;
    DROP TABLE IF EXISTS content.event_events;
`);
