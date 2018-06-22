import { expect } from 'chai'
import 'mocha'
import * as td from 'testdouble'

import { Env } from '@truesparrow/common-js'
import { IdentityClient } from '@truesparrow/identity-sdk-js'

import { AppConfig } from './app-config'
import { newPublicContentRouter, newPrivateContentRouter } from './content-router'
import { Repository } from './repository'


describe('PublicContentRouter', () => {
    const localAppConfig: AppConfig = {
        env: Env.Local,
        name: 'identity',
        forceDisableLogging: true,
        logglyToken: null,
        logglySubdomain: null,
        rollbarToken: null
    };

    const stagingAppConfig: AppConfig = {
        env: Env.Staging,
        name: 'identity',
        forceDisableLogging: true,
        logglyToken: 'A FAKE TOKEN',
        logglySubdomain: 'a-fake-subdomain',
        rollbarToken: null
    };

    const repository = td.object({
    });

    const identityClient = td.object({
    });

    afterEach('reset test doubles', () => {
        td.reset();
    });

    it('can be constructed', () => {
        const contentRouter = newPublicContentRouter(localAppConfig, repository as Repository, identityClient as IdentityClient);

        expect(contentRouter).is.not.null;
    });

    it('can be constructed with prod settings', () => {
        const contentRouter = newPublicContentRouter(stagingAppConfig, repository as Repository, identityClient as IdentityClient);

        expect(contentRouter).is.not.null;
    });
});


describe('PrivateContentRouter', () => {
    const localAppConfig: AppConfig = {
        env: Env.Local,
        name: 'identity',
        forceDisableLogging: true,
        logglyToken: null,
        logglySubdomain: null,
        rollbarToken: null
    };

    const stagingAppConfig: AppConfig = {
        env: Env.Staging,
        name: 'identity',
        forceDisableLogging: true,
        logglyToken: 'A FAKE TOKEN',
        logglySubdomain: 'a-fake-subdomain',
        rollbarToken: null
    };

    const repository = td.object({
    });

    const identityClient = td.object({
    });

    const chargebeeClient = td.object({
    });

    afterEach('reset test doubles', () => {
        td.reset();
    });

    it('can be constructed', () => {
        const contentRouter = newPrivateContentRouter(localAppConfig, repository as Repository, identityClient as IdentityClient, chargebeeClient);

        expect(contentRouter).is.not.null;
    });

    it('can be constructed with prod settings', () => {
        const contentRouter = newPrivateContentRouter(stagingAppConfig, repository as Repository, identityClient as IdentityClient, chargebeeClient);

        expect(contentRouter).is.not.null;
    });
});
