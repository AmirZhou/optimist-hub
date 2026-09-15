/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as customers from "../customers.js";
import type * as drawings from "../drawings.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as inspections from "../inspections.js";
import type * as inspectors from "../inspectors.js";
import type * as lib_db from "../lib/db.js";
import type * as lib_validation from "../lib/validation.js";
import type * as ncrs from "../ncrs.js";
import type * as partThreads from "../partThreads.js";
import type * as parts from "../parts.js";
import type * as reports from "../reports.js";
import type * as seed from "../seed.js";
import type * as threads from "../threads.js";
import type * as workorders from "../workorders.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  customers: typeof customers;
  drawings: typeof drawings;
  files: typeof files;
  http: typeof http;
  inspections: typeof inspections;
  inspectors: typeof inspectors;
  "lib/db": typeof lib_db;
  "lib/validation": typeof lib_validation;
  ncrs: typeof ncrs;
  partThreads: typeof partThreads;
  parts: typeof parts;
  reports: typeof reports;
  seed: typeof seed;
  threads: typeof threads;
  workorders: typeof workorders;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
