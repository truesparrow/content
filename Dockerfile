FROM node

MAINTAINER CHM SQRT2 Team <horia141@gmail.com>

# Setup users and groups.

RUN groupadd truesparrow && \
    useradd -ms /bin/bash -g truesparrow truesparrow

# Copy source code.

RUN mkdir /truesparrow
COPY . /truesparrow
RUN chown -R truesparrow:truesparrow /truesparrow/out

# Setup the runtime environment for the application.

ENV ENV LOCAL
ENV ADDRESS 0.0.0.0
ENV PORT 10000
ENV DATABASE_URL postgresql://truesparrow:truesparrow@truesparrow-postgres:5432/truesparrow
ENV DATABASE_MIGRATIONS_DIR /truesparrow/migrations
ENV DATABASE_MIGRATIONS_TABLE migrations_content
ENV ORIGIN http://localhost:10001
ENV CLIENTS http://localhost:10003,http://localhost:10004

WORKDIR /truesparrow
EXPOSE 10000
USER truesparrow
ENTRYPOINT ["npm", "run", "serve-dev"]
