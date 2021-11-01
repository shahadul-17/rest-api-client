export interface IRestApiClientRequestOptions
  extends Record<string, any> {
  routeName: string;
  data?: FormData | Record<string, any>;
  /** (Optional) Any additional data that needs to be passed down. */
  additionalData?: Record<string, any>;
  /** (Optional) Request tags that needs to be passed down. */
  requestTags?: string[];
  /**
   * Setting this value to true will parse request body as JSON
   * if possible. Default value is true.
   */
  automaticJsonRequestBodyParsing?: boolean;
  /**
   * Setting this value to true will parse response body as JSON
   * if possible. Default value is true.
   */
  automaticJsonResponseBodyParsing?: boolean;
  /**
   * Number of milliseconds a request can take before automatically
   * being terminated. Default value is 0.
   */
  timeout?: number;
}
