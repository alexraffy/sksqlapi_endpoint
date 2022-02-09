import {RequestContext} from "./RequestContext";


export function ping(cx: RequestContext) {
    let payload = {
        timestamp: new Date().toISOString()
    }
    cx.response.send(200, payload);
    return cx.next();
}