import type { ZodObject, ZodRawShape, ZodUnion, z } from "zod";
import { canonicalizeInput, encodeInput, decodeInput } from "./inputEncoding";

export type RouteCache = {
  sMaxAge: number;
  staleWhileRevalidate: number;
  maxAge?: number;
};

type Route<
  Cmd extends string,
  Input extends ZodObject<ZodRawShape> | ZodUnion<any>,
  Result extends object | null,
  Env extends {},
> = {
  route: Cmd;
  input: Input;
  handler: (msg: z.infer<Input>, env: Env) => Promise<Result>;
  // Viewer-independent reads only: set this to also serve the route as a
  // CDN-cacheable GET. See app/api/rpc/cacheableRoutes.ts.
  cache?: RouteCache;
};

type Routes<Env extends {}> = Route<string, any, any, Env>[];

// GET URLs above this length risk being truncated by intermediate proxies;
// falling back to POST keeps the request correct at the cost of caching.
const MAX_GET_URL_LENGTH = 2000;

export function makeAPIClient<R extends Routes<any>>(
  basePath: string,
  cacheableRoutes: ReadonlySet<string> = new Set(),
) {
  return async <T extends R[number]["route"]>(
    route: T,
    data: z.infer<Extract<R[number], { route: T }>["input"]>,
  ) => {
    if (cacheableRoutes.has(route)) {
      let encoded = encodeInput(canonicalizeInput(data));
      let url = `${basePath}/${route}?input=${encoded}`;
      if (url.length <= MAX_GET_URL_LENGTH) {
        let result = await fetch(url, { method: "GET" });
        return result.json() as Promise<
          Awaited<ReturnType<Extract<R[number], { route: T }>["handler"]>>
        >;
      }
    }
    let result = await fetch(`${basePath}/${route}`, {
      body: JSON.stringify(data),
      method: "POST",
      headers: { "Content-type": "application/json" },
    });
    return result.json() as Promise<
      Awaited<ReturnType<Extract<R[number], { route: T }>["handler"]>>
    >;
  };
}

async function runHandler<Env extends {}>(
  handler: Routes<Env>[number],
  body: unknown,
  env: Env,
): Promise<{ status: number; result: unknown }> {
  let msg = handler.input.safeParse(body);
  if (!msg.success) return { status: 400, result: msg.error };
  try {
    let result = (await handler.handler(msg.data as any, env)) as object;
    return { status: 200, result };
  } catch (e) {
    console.log(e);
    return {
      status: 500,
      result: {
        error: "An error occured while handling this request",
        errorText: (e as Error).toString(),
      },
    };
  }
}

export const makeRouter = <Env extends {}>(routes: Routes<Env>) => {
  return async (route: string, request: Request, env: Env) => {
    let status = 200;
    let result;
    let cache: RouteCache | undefined;
    let handler = routes.find((f) => f.route === route);

    switch (request.method) {
      case "GET": {
        if (!handler || !handler.cache) {
          status = 404;
          result = { error: `route ${route} not Found` };
          break;
        }

        let encoded = new URL(request.url).searchParams.get("input");
        let body: unknown = {};
        if (encoded) {
          try {
            body = decodeInput(encoded);
          } catch (e) {
            status = 400;
            result = { error: "input must be valid base64url-encoded JSON" };
            break;
          }
        }

        ({ status, result } = await runHandler(handler, body, env));
        if (status === 200) cache = handler.cache;
        break;
      }
      case "POST": {
        if (!handler) {
          status = 404;
          result = { error: `route ${route} not Found` };
          break;
        }

        let body;
        if (handler.input)
          try {
            body = await request.json();
          } catch (e) {
            result = { error: "Request body must be valid JSON" };
            status = 400;
            break;
          }

        ({ status, result } = await runHandler(handler, body, env));
        break;
      }
      default:
        status = 404;
        result = { error: "Only POST Supported" };
    }

    let res = new Response(JSON.stringify(result), {
      status,
      headers: {
        "Access-Control-Allow-Credentials": "true",
        "Content-type": "application/json;charset=UTF-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
        "Cache-Control":
          status === 200 && cache
            ? `public, max-age=${cache.maxAge ?? 0}, s-maxage=${cache.sMaxAge}, stale-while-revalidate=${cache.staleWhileRevalidate}`
            : "no-store",
        ...(status === 200 && cache
          ? {
              "CDN-Cache-Control": `public, s-maxage=${cache.sMaxAge}, stale-while-revalidate=${cache.staleWhileRevalidate}`,
            }
          : {}),
      },
    });
    //result.headers?.forEach((h) => res.headers.append(h[0], h[1]));
    return res;
  };
};

export function makeRoute<
  Cmd extends string,
  Input extends ZodObject<ZodRawShape> | ZodUnion<any>,
  Result extends object | null,
  Env extends {},
>(d: Route<Cmd, Input, Result, Env>) {
  return d;
}
