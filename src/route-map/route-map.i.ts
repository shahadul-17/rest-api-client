import { IRoutes } from "./routes.i";

export interface IRouteMap {
  /** Route map version. */
  version?: string;
  /** Last modified date. */
  dateModified?: string;
  /** Collection of routes. */
  routes: IRoutes;
}
