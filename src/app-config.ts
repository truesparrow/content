/** Defines the application configuration as an object. */

/** Imports. Also so typedoc works correctly. */
import { Env } from '@truesparrow/common-js'

/** Application level configuration needed in building the content router. */
export interface AppConfig {
    /** The current {@link Env}. */
    env: Env;
    /** A unique name for this service. */
    name: string;
    /**
     * Disable all logging. Used for tests. Otherwise logs output to the console in {@link Env.Local}
     * and {@link Env.Test} and to loggly in {@link Env.Staging} or {@link Env.Prod}
     */
    forceDisableLogging: boolean;
    /** The secret token for the Loggly logging service. */
    logglyToken: string | null;
    /** The subdomain for the Loggly logging service. */
    logglySubdomain: string | null;
    /** The secret token for the Rollbar error reporting service. */
    rollbarToken: string | null;
}
