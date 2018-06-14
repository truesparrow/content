exports.up = (knex, Promise) => knex.schema.raw(`
    ALTER TABLE content.events
    ADD COLUMN IF NOT EXISTS subscription_id Text NULL;

    ALTER TABLE content.events
    ADD COLUMN IF NOT EXISTS subscription_active Boolean DEFAULT FALSE;

    ALTER TABLE content.events
    ALTER COLUMN subscription_active SET NOT NULL;
`);

exports.down = (knex, Promise) => knex.schema.raw(`
    ALTER TABLE content.events
    DROP COLUMN IF EXISTS subscription_active;

    ALTER TABLE content.events
    DROP COLUMN IF EXISTS subscription_id;
`);
