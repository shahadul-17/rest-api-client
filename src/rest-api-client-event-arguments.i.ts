import { IHttpEventArguments } from "@shahadul-17/http-client";
import { IRestApiClientRequestOptions } from "./rest-api-client-request-options.i";

export interface IRestApiClientEventArguments<EventType extends string>
  extends IHttpEventArguments<EventType> {
  restApiClientRequestOptions: IRestApiClientRequestOptions;
}
