import { IRouteMap } from "./route-map";

export interface IRestApiClientOptions
  extends Record<string, any> {
  /** API version. */
  apiVersion?: string;
  name?: string;
  host?: string;
  basePath?: string;
  baseUrl?: string;
  routeMapPath?: string;
  routeMapUrl?: string;
  routeMap?: IRouteMap;
  /**
   * (Optional) Indicates whether or not stack trace
   * should be included in case of error. Default value
   * is false.
   */
  includeErrorStackTrace?: boolean;
  /**
   * (Optional) Indicates whether or not cross-site Access-Control
   * requests should be made using credentials such as cookies,
   * authorization headers or TLS client certificates. Setting
   * this value has no effect on same-origin requests.
   */
  allowCredentialsOnCrossSiteRequests?: boolean;
  /** (Optional) Name of the authorization header. */
  authorizationHeader?: string;
  /** (Optional) Name of the authorization refresh header. */
  authorizationRefreshHeader?: string;
}
