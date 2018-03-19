module.exports = {
    client: 'pg',
    connection: process.env.CONTENT_DATABASE_URL,
    pool: {
        min: 2,
        max: 10
    },
    migrations: {
        directory: process.env.CONTENT_DATABASE_MIGRATIONS_DIR,
        tableName: process.env.CONTENT_DATABASE_MIGRATIONS_TABLE
    }
}
