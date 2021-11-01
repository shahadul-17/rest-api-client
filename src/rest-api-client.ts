import { UIDGenerator } from "@shahadul-17/uid-generator";
import {
  HttpClient, HttpError, IHttpRequestOptions,
  IHttpResponse, HttpUtilities, DataUtilities,
} from "@shahadul-17/http-client";
import { IRestApiClientOptions } from "./rest-api-client-options.i";
import { IRestApiClient } from "./rest-api-client.i";
import { IRouteMap } from "./route-map";
import { ITokenProvider } from "./token-provider.i";
import { RestApiClientEvent } from "./rest-api-client-event.e";
import { HttpAndRestApiClientEvent } from "./http-and-rest-api-client-event.t";
import { IRestApiClientRequestOptions } from "./rest-api-client-request-options.i";
import { IRestApiClientEventArguments } from "./rest-api-client-event-arguments.i";

const DEFAULT_REST_API_CLIENT_NAME = "DEFAULT_REST_API_CLIENT";
const DEFAULT_HTTP_AUTHORIZATION_HEADER = "authorization";
const DEFAULT_HTTP_AUTHORIZATION_REFRESH_HEADER = "authorization-refresh";

export class RestApiClient<EventType extends string = HttpAndRestApiClientEvent,
  ArgumentsType extends IRestApiClientEventArguments<EventType> = IRestApiClientEventArguments<EventType>>
  extends HttpClient<EventType, ArgumentsType> implements IRestApiClient<EventType, ArgumentsType> {

  private readonly _options: IRestApiClientOptions;
  private _tokenProvider?: ITokenProvider<EventType, ArgumentsType>;

  protected constructor(options: IRestApiClientOptions) {
    super();

    this._options = options;
  }

  private async _requestRouteMapAsync(url: string): Promise<IRouteMap> {
    try {
      // requests for resource...
      const response = await this.sendRequestAsync(url);

      // if http response status code is not OK (200),
      // we throw error...
      if (response.status !== 200 || !response.jsonData) { throw new Error(); }

      return response.jsonData as IRouteMap;
    } catch (error) {
      throw new Error("An error occurred while requesting route map.");
    }
  }

  getRouteMapUrl(): undefined | string {
    return this._options.routeMapUrl;
  }

  setRouteMapUrl(routeMapUrl?: string): void {
    this._options.routeMapUrl = routeMapUrl;
  }

  getRouteMap(): undefined | IRouteMap {
    return this._options.routeMap;
  }

  setRouteMap(routeMap?: IRouteMap): void {
    this._options.routeMap = routeMap;
  }

  async updateRouteMapAsync(): Promise<void> {
    const routeMapUrl = this.getRouteMapUrl();

    if (!routeMapUrl) { return; }

    // an error might occur while requesting route map...
    const routeMap = await this._requestRouteMapAsync(routeMapUrl);

    // setting the new route map...
    this.setRouteMap(routeMap);
  }

  getTokenProvider(): undefined | ITokenProvider<EventType, ArgumentsType> {
    return this._tokenProvider;
  }

  setTokenProvider(tokenProvider: undefined | ITokenProvider<EventType, ArgumentsType>): void {
    this._tokenProvider = tokenProvider;
  }

  prepareRequestOptions(routeName: string,
    data?: Record<string, any> | FormData): IHttpRequestOptions {
    const route = this._options.routeMap?.routes[routeName];

    // if route is not available...
    if (!route) { throw new HttpError(400, `Specified route, '${routeName}' was not found.`); }

    let requestOptions: IHttpRequestOptions = {
      method: route.method,
      url: "",
      body: undefined,
      headers: undefined,
    };

    // sets path parameters...
    let path = HttpUtilities.setPathParameters(route.path, data);
    // sets query parameters...
    path = HttpUtilities.setQueryParameters(path, route.queries, data);

    // this temporary variable is used because we don't want to
    // accidentally manipulate the original data object...
    let temporaryData = DataUtilities.clone(data);

    // if number of header parameters is greater than zero and token provider is set...
    if (this._tokenProvider) {
      // and data doesn't already contain access token...
      if (!DataUtilities.getValue(this._options.authorizationHeader as string, temporaryData)) {
        // we put access token to data...
        temporaryData = DataUtilities.setValue(this._options.authorizationHeader as string,
          this._tokenProvider.getAccessToken(), temporaryData);
      }

      // also if data doesn't already contain refresh token...
      if (!DataUtilities.getValue(this._options.authorizationRefreshHeader as string, temporaryData)) {
        // we put refresh token to data...
        temporaryData = DataUtilities.setValue(this._options.authorizationRefreshHeader as string,
          this._tokenProvider.getRefreshToken(), temporaryData);
      }
    }

    // headers (in route) might contain authorization headers...
    const headers = HttpUtilities.prepareRequestHeaders(route.headers, temporaryData);
    // prepares form using provided data...
    const form = HttpUtilities.prepareFormData(route.form, data);

    // if the form is not 'undefined'/'null' we set that to request body...
    if (form) { requestOptions.body = form; }

    // prepares request body using provided data...
    const body = HttpUtilities.prepareRequestBody(route.body, data);

    if (body) { requestOptions.body = body; }

    requestOptions.url = path.startsWith("http://") ||
      path.startsWith("https://") ?
      path : `${this._options.baseUrl}${path}`;
    requestOptions.headers = headers;

    return requestOptions;
  }

  async sendSmartRequestAsync(requestOptions: IRestApiClientRequestOptions): Promise<IHttpResponse> {
    // generates a unique request ID on each request...
    const requestId = RestApiClient._uidGenerator.generate();

    requestOptions.additionalData = {
      ...requestOptions.additionalData,
      requestId: requestId,
      routeName: requestOptions.routeName,
      requestData: requestOptions.data,
    };

    let httpRequestOptions: IHttpRequestOptions;

    try {
      httpRequestOptions = this.prepareRequestOptions(requestOptions.routeName, requestOptions.data);
    } catch (error) {
      const response = (error as HttpError).toResponse();

      this.fireEventListeners({
        type: RestApiClientEvent.DataValidationError,
        restApiClientRequestOptions: requestOptions,
        httpResponse: response,
      } as ArgumentsType);

      return response;
    }

    httpRequestOptions.timeout = requestOptions.timeout;
    httpRequestOptions.additionalData = requestOptions.additionalData;
    httpRequestOptions.requestTags = requestOptions.requestTags;
    httpRequestOptions.automaticJsonRequestBodyParsing = requestOptions.automaticJsonRequestBodyParsing;
    httpRequestOptions.automaticJsonResponseBodyParsing = requestOptions.automaticJsonResponseBodyParsing;

    this.fireEventListeners({
      type: RestApiClientEvent.BeforeRequestSend,
      httpRequestOptions: httpRequestOptions,
      restApiClientRequestOptions: requestOptions,
    } as ArgumentsType);

    let response = await this.sendRequestAsync(httpRequestOptions);

    // if response status is equal to 401
    // and we have refresh token in local storage,
    // then we request to refresh the access token...
    if (response.status === 401 && this._tokenProvider?.isTokenExpired(response, this)) {
      const shallRetry = await this._tokenProvider.renewAccessTokenAsync(this._options.routeName, this);

      if (shallRetry) {
        /**
         * we are not using try-catch block here because,
         * 'prepareRequestOptions()' method has already
         * passed successfully once. Otherwise, this piece of
         * code wouldn't be executing...
         */
        httpRequestOptions = this.prepareRequestOptions(this._options.routeName, this._options.data);
        response = await this.sendRequestAsync(httpRequestOptions);
      }
    }

    if (response.status < 0) {
      this.fireEventListeners({
        type: RestApiClientEvent.ConnectionError,
        httpRequestOptions: httpRequestOptions,
        restApiClientRequestOptions: requestOptions,
        httpResponse: response,
      } as ArgumentsType);
    } else {
      this.fireEventListeners({
        type: RestApiClientEvent.ResponseReceive,
        httpRequestOptions: httpRequestOptions,
        restApiClientRequestOptions: requestOptions,
        httpResponse: response,
      } as ArgumentsType);
    }

    return response;
  }

  //#region Static Properties and Methods

  private static readonly _uidGenerator = UIDGenerator.create();
  // key-value store for RestApiClient instances...
  private static readonly _instances = new Map<string, IRestApiClient<any, any>>();

  /**
   * Returns instance (singleton) of RestApiClient. This method
   * will never create new instance. So first, you must call
   * createInstance() method.
   * @param {String} name Name of the RestApiClient instance. For default
   * instance, don't provide any value to this parameter.
   * @returns Returns instance (singleton) of RestApiClient.
   */
  static getInstance<EventType extends string = HttpAndRestApiClientEvent,
    ArgumentsType extends IRestApiClientEventArguments<EventType>
    = IRestApiClientEventArguments<EventType>>(name = DEFAULT_REST_API_CLIENT_NAME)
    : undefined | IRestApiClient<EventType, ArgumentsType> {
    return this._instances.get(name) as IRestApiClient<EventType, ArgumentsType>;
  }

  /**
   * This method is used to determine if RestApiClient
   * is initialized or not.
   * @param {String} name Name of the RestApiClient instance. For default
   * instance, don't provide any value to this parameter.
   * @returns Returns true if RestApiClient is initialized.
   * Otherwise returns false.
   */
  static isInitialized(name?: string): boolean {
    return RestApiClient.getInstance(name) ? true : false;
  }

  /**
   * Sets instance of RestApiClient.
   * @param {IRestApiClient} restApiClient Instance of RestApiClient that needs to be set.
   * @param {String} name Name of the RestApiClient instance. To set default
   * instance, don't provide any value to this parameter.
   */
  static setInstance<EventType extends string = HttpAndRestApiClientEvent,
    ArgumentsType extends IRestApiClientEventArguments<EventType>
    = IRestApiClientEventArguments<EventType>>(restApiClient: IRestApiClient<EventType, ArgumentsType>,
      name = DEFAULT_REST_API_CLIENT_NAME): void {
    // sets instance to map...
    this._instances.set(name, restApiClient);

    // if default instance is initialized, we return...
    if (this.isInitialized()) { return; }

    // otherwise, we set the provided RestApiClient as default...
    this.setInstance(restApiClient);
  }

  /**
   * Initializes RestApiClient and returns instance (singleton).
   * If RestApiClient is already initialized, it will return the
   * pre-instantiated instance.
   * @param {IRestApiClientOptions} options Options for initializing RestApiClient.
   * @returns Returns instance (singleton) of RestApiClient.
   */
  static async createInstanceAsync<EventType extends string = HttpAndRestApiClientEvent,
    ArgumentsType extends IRestApiClientEventArguments<EventType>
    = IRestApiClientEventArguments<EventType>>(options: IRestApiClientOptions)
    : Promise<undefined | IRestApiClient<EventType, ArgumentsType>> {
    const restApiClient = this.getInstance<EventType, ArgumentsType>(options.name);

    // if we already have the instance, return that...
    if (restApiClient) { return restApiClient; }

    // if host is not set, we set empty string...
    options.host ??= "";
    // if base path is not set, we set empty string...
    options.basePath ??= "";
    // if base url is not set, we prepare base url...
    options.baseUrl ??= `${options.host}${options.basePath}`;
    // if route map path is not set, we set empty string...
    options.routeMapPath ??= "";
    // if route map url is not set, we prepare the route map url...
    options.routeMapUrl ??= `${options.baseUrl}${HttpUtilities.setPathParameters(options.routeMapPath, options)}`;
    // if authorization header is not set, we set it to default...
    options.authorizationHeader ??= DEFAULT_HTTP_AUTHORIZATION_HEADER;
    // if authorization refresh header is not set, we set it to default...
    options.authorizationRefreshHeader ??= DEFAULT_HTTP_AUTHORIZATION_REFRESH_HEADER;

    // creating new instance of RestApiClient...
    const _restApiClient = new RestApiClient<EventType, ArgumentsType>(options);

    // if route map is not provided, we will request for route map...
    if (!options.routeMap) {
      // otherwise, we will request for route map. an error
      // might occur while requesting route map...
      options.routeMap = await _restApiClient._requestRouteMapAsync(options.routeMapUrl);
    }

    // setting the instance to Map...
    this.setInstance(_restApiClient, options.name);

    return _restApiClient;
  }

  //#endregion
}
