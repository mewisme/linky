export type BuildUrlQuery = URLSearchParams | Record<string, string | number | boolean | undefined>;

type ExtractColonParams<P extends string> = P extends `${string}:${infer Param}/${infer Rest}`
  ? Param | ExtractColonParams<`/${Rest}`>
  : P extends `${string}:${infer Param}`
    ? Param
    : never;

type ExtractBraceParams<P extends string> = P extends `${string}{${infer Param}}${infer Rest}`
  ? Param | ExtractBraceParams<Rest>
  : never;

export type ExtractPathParams<P extends string> = ExtractColonParams<P> | ExtractBraceParams<P>;

export type PathParamsFromPath<P extends string> = [ExtractPathParams<P>] extends [never]
  ? Record<string, never>
  : Record<ExtractPathParams<P>, string | number>;

export interface BuildUrlOptions<TPathParams = Record<string, string | number>> {
  pathParams?: TPathParams;
  query?: BuildUrlQuery;
}

function applyPathParams(path: string, pathParams: Record<string, string | number>): string {
  let result = path;
  for (const [key, value] of Object.entries(pathParams)) {
    result = result.replace(new RegExp(`:${key}(?=/|$)`, 'g'), String(value));
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }
  return result;
}

function queryToString(query: BuildUrlQuery): string {
  if (query instanceof URLSearchParams) {
    const s = query.toString();
    return s;
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

export class BaseApiUrl {
  constructor(
    protected readonly baseUrl: string,
    private readonly pathStrip: number = 0
  ) {}

  protected buildUrl(path: string): string;
  protected buildUrl(path: string, query?: URLSearchParams): string;
  protected buildUrl<P extends string>(
    path: P,
    options: BuildUrlOptions<PathParamsFromPath<P>>
  ): string;
  protected buildUrl(
    path: string,
    optionsOrQuery?: URLSearchParams | BuildUrlOptions
  ): string {
    let resolvedPath = path;
    let queryString = '';

    if (optionsOrQuery !== undefined) {
      if (optionsOrQuery instanceof URLSearchParams) {
        queryString = optionsOrQuery.toString();
      } else {
        const opts = optionsOrQuery;
        if (opts.pathParams) {
          resolvedPath = applyPathParams(resolvedPath, opts.pathParams);
        }
        if (opts.query) {
          queryString = queryToString(opts.query);
        }
      }
    }

    if (this.pathStrip > 0) {
      resolvedPath = resolvedPath.slice(this.pathStrip);
    }

    const search = queryString ? `?${queryString}` : '';
    return `${this.baseUrl}${resolvedPath}${search}`;
  }
}
