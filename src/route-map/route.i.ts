import { HttpMethod } from "@shahadul-17/http-client";

export interface IRoute {
  /** HTTP request method. */
  method: HttpMethod;
  /** Header parameters. */
  headers?: string[];
  /** URL of the route. */
  path: string;
  /** Query parameters. */
  queries?: string[];
  /** Sends data as JSON. */
  body?: string[];
  /** Sends data as html form. */
  form?: string[];
  /** Route description. */
  description?: string;
}
