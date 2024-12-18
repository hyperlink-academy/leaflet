import { ZodObject, ZodRawShape, ZodUnion, z } from "zod";

type Route<
  Cmd extends string,
  Input extends ZodObject<ZodRawShape> | ZodUnion<any>,
  Result extends object | null,
  Env extends {},
> = {
  route: Cmd;
  input: Input;
  handler: (msg: z.infer<Input>, env: Env) => Promise<Result>;
};

type Routes<Env extends {}> = Route<string, any, any, Env>[];

export function makeAPIClient<R extends Routes<any>>(basePath: string) {
  return async <T extends R[number]["route"]>(
    route: T,
    data: z.infer<Extract<R[number], { route: T }>["input"]>,
  ) => {
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

export const makeRouter = <Env extends {}>(routes: Routes<Env>) => {
  return async (route: string, request: Request, env: Env) => {
    let status = 200;
    let result;
    switch (request.method) {
      case "POST": {
        let handler = routes.find((f) => f.route === route);
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

        let msg = handler.input.safeParse(body);
        if (!msg.success) {
          status = 400;
          result = msg.error;
          break;
        }
        try {
          result = (await handler.handler(msg.data as any, env)) as object;
          break;
        } catch (e) {
          console.log(e);
          status = 500;
          result = {
            error: "An error occured while handling this request",
            errorText: (e as Error).toString(),
          };
          break;
        }
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
