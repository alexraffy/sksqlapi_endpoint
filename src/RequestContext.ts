
import {Next, Response, Request} from "restify";



export interface RequestContext {
    request: Request
    response: Response
    next: Next
}
