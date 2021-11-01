import { HttpEvent } from "@shahadul-17/http-client";
import { RestApiClientEvent } from "./rest-api-client-event.e";

export type HttpAndRestApiClientEvent = HttpEvent | RestApiClientEvent;
