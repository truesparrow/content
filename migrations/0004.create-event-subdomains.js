exports.up = (knex, Promise) => knex.schema.raw(`
    CREATE TYPE content.event_subdomain_state
        AS ENUM ('active', 'inactive');

    CREATE TABLE content.event_subdomains (
        -- Primary key
        id Serial,
        PRIMARY KEY (id),
        -- Core properties
        state content.event_subdomain_state NOT NULL,
        subdomain varchar(64) NOT NULL,
        -- Foreign keys
        event_id Int NOT NULL REFERENCES content.events(id),
        -- Foreign key to external systems
        user_id Int NOT NULL
    );

    CREATE INDEX event_subdomains_subdomain
        ON content.event_subdomains(subdomain);
    CREATE UNIQUE INDEX event_subdomains_active_subdomain
        ON content.event_subdomains(subdomain)
        WHERE state='active';
`);

exports.down = (knex, Promise) => knex.schema.raw(`
    DROP TABLE IF EXISTS content.event_subdomains;
    DROP TYPE IF EXISTS content.event_subdomain_state;
`);
