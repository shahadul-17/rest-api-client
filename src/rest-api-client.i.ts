import { IRouteMap } from "./route-map";
import { ITokenProvider } from "./token-provider.i";
import { IHttpClient, IHttpRequestOptions, IHttpResponse } from "@shahadul-17/http-client";
import { HttpAndRestApiClientEvent } from "./http-and-rest-api-client-event.t";
import { IRestApiClientRequestOptions } from ".";
import { IRestApiClientEventArguments } from "./rest-api-client-event-arguments.i";

export interface IRestApiClient<EventType extends string = HttpAndRestApiClientEvent,
  ArgumentsType extends IRestApiClientEventArguments<EventType> = IRestApiClientEventArguments<EventType>>
  extends IHttpClient<EventType, ArgumentsType> {

  getRouteMapUrl(): undefined | string;
  setRouteMapUrl(routeMapUrl?: string): void;
  getRouteMap(): undefined | IRouteMap;
  setRouteMap(routeMap?: IRouteMap): void;
  updateRouteMapAsync(): Promise<void>;
  getTokenProvider(): undefined | ITokenProvider<EventType, ArgumentsType>;
  setTokenProvider(tokenProvider: undefined | ITokenProvider<EventType, ArgumentsType>): void;
  prepareRequestOptions(routeName: string, data?: Record<string, any>): IHttpRequestOptions;
  sendSmartRequestAsync(requestOptions: IRestApiClientRequestOptions): Promise<IHttpResponse>;
}
