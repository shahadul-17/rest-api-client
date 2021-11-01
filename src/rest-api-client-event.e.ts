export enum RestApiClientEvent {
  /** This event is fired before sending request. */
  BeforeRequestSend = "BEFORE_REQUEST_SEND",
  /** This event is fired when response received on client's request. */
  ResponseReceive = "RESPONSE_RECEIVE",
  /** This event is fired when data validation error is encountered. */
  DataValidationError = "DATA_VALIDATION_ERROR",
  /** This event is fired when connection error is encountered. */
  ConnectionError = "CONNECTION_ERROR",
}
