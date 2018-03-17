FROM node

MAINTAINER CHM SQRT2 Team <contact@chm-sqrt2.com>

# Setup users and groups.

RUN groupadd truesparrow && \
    useradd -ms /bin/bash -g truesparrow truesparrow

# Copy source code.

RUN mkdir /truesparrow
COPY . /truesparrow
RUN chown -R truesparrow:truesparrow /truesparrow/out

# Setup the runtime environment for the application.

WORKDIR /truesparrow
EXPOSE 10002
USER truesparrow
ENTRYPOINT ["npm", "run", "serve-dev"]
