/** Defines the TestRouter. */

/** Imports. Also so typedoc works correctly. */
import { wrap } from 'async-middleware'
import * as compression from 'compression'
import * as express from 'express'
import * as HttpStatus from 'http-status-codes'

import {
    newCommonApiServerMiddleware,
    newLocalCommonServerMiddleware,
    Request
} from '@truesparrow/common-server-js'

import { AppConfig } from './app-config'
import { Repository } from './repository'


/**
 * Construct a TestRouter. This is a fully formed and independent {@link express.Router}
 * which implements a bunch of test-only code for the content service. The aim is to easily be able
 * to do some high-level operations, such as clearing out test data, or creating fake events etc.
 * @note The router has the following paths exposed:
 *     @path /clear-out POST
 * @param config - the application configuration.
 * @param repository - a repository.
 * @return A {link express.Router} doing the above.
 */
export function newTestRouter(config: AppConfig, repository: Repository): express.Router {
    const testRouter = express.Router();

    testRouter.use(newLocalCommonServerMiddleware(config.name, config.env, config.forceDisableLogging));
    testRouter.use(compression({ threshold: 0 }));
    testRouter.use(newCommonApiServerMiddleware(config.clients));

    testRouter.post('/clear-out', wrap(async (req: Request, res: express.Response) => {
        try {
            await repository.testClearOut();

            res.status(HttpStatus.OK);
            res.end();
        } catch (e) {
            req.log.error(e);
            req.errorLog.error(e);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR);
            res.end();
        }
    }));

    return testRouter;
}
