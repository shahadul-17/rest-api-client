import { IHttpResponse } from '@shahadul-17/http-client/dist';
import { IRestApiClientEventArguments } from './rest-api-client-event-arguments.i';
import { IRestApiClient } from './rest-api-client.i';

export interface ITokenProvider<EventType extends string,
  ArgumentsType extends IRestApiClientEventArguments<EventType>> {
  getAccessToken(): string;
  getRefreshToken(): string;
  isTokenExpired(response: IHttpResponse,
    restApiClient: IRestApiClient<EventType, ArgumentsType>): boolean;
  renewAccessTokenAsync(routeName: string,
    restApiClient: IRestApiClient<EventType, ArgumentsType>): Promise<boolean>;
}
