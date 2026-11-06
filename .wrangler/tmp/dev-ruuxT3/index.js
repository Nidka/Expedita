var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/domain/shared/fecha.ts
function aDate(fecha) {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d));
}
__name(aDate, "aDate");
function aISO(d) {
  return d.toISOString().slice(0, 10);
}
__name(aISO, "aISO");
function sumarDias(fecha, dias) {
  const d = aDate(fecha);
  d.setUTCDate(d.getUTCDate() + dias);
  return aISO(d);
}
__name(sumarDias, "sumarDias");

// src/application/exportar.ts
var escICS = /* @__PURE__ */ __name((s) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"), "escICS");
var plegar = /* @__PURE__ */ __name((l) => l.match(/.{1,73}/g)?.join("\r\n ") ?? l, "plegar");
function aUtc(fecha, hora) {
  const [h, m] = hora.split(":").map(Number);
  const d = new Date(Date.UTC(+fecha.slice(0, 4), +fecha.slice(5, 7) - 1, +fecha.slice(8, 10), h + 5, m));
  return d.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
}
__name(aUtc, "aUtc");
function generarICS(eventos, nombre = "Expedita") {
  const ahora = (/* @__PURE__ */ new Date()).toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const lineas = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Expedita//Plazos//ES", "CALSCALE:GREGORIAN", `X-WR-CALNAME:${escICS(nombre)}`];
  for (const e of eventos) {
    lineas.push("BEGIN:VEVENT", `UID:${e.uid}@expedita`, `DTSTAMP:${ahora}`);
    if (e.hora) {
      const [h, m] = e.hora.split(":").map(Number);
      const fin = `${String(Math.min(h + 1, 23)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      lineas.push(`DTSTART:${aUtc(e.fecha, e.hora)}`, `DTEND:${aUtc(e.fecha, fin)}`);
    } else {
      lineas.push(`DTSTART;VALUE=DATE:${e.fecha.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${sumarDias(e.fecha, 1).replace(/-/g, "")}`);
    }
    lineas.push(`SUMMARY:${escICS(e.titulo)}`);
    if (e.descripcion) lineas.push(`DESCRIPTION:${escICS(e.descripcion)}`);
    if (e.lugar) lineas.push(`LOCATION:${escICS(e.lugar)}`);
    for (const [disparo, texto] of [
      ["-P1D", "Ma\xF1ana"],
      ["-PT1H", "En una hora"]
    ])
      lineas.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escICS(`${texto}: ${e.titulo}`)}`, `TRIGGER:${disparo}`, "END:VALARM");
    lineas.push("END:VEVENT");
  }
  lineas.push("END:VCALENDAR");
  return lineas.map(plegar).join("\r\n");
}
__name(generarICS, "generarICS");

// worker/index.ts
var RUTA = /^\/calendario\/([a-f0-9]{40,})\.ics$/;
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const m = RUTA.exec(url.pathname);
    if (!m) return env.ASSETS.fetch(request);
    if (request.method !== "GET" && request.method !== "HEAD") return new Response("M\xE9todo no permitido", { status: 405 });
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/calendario_eventos`, {
      method: "POST",
      headers: { apikey: env.SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ p_token: m[1] })
    });
    if (!r.ok) return new Response("Calendario no encontrado", { status: 404, headers: { "Cache-Control": "no-store" } });
    const datos = await r.json();
    const eventos = datos.eventos.map((e) => ({ ...e, hora: e.hora ?? void 0, lugar: e.lugar ?? void 0, descripcion: e.descripcion || void 0 }));
    return new Response(generarICS(eventos, `${datos.estudio} \xB7 Expedita`), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="expedita.ics"',
        // Los calendarios la vuelven a pedir cada pocas horas; no se guarda en cachés intermedias
        "Cache-Control": "private, max-age=900",
        "X-Robots-Tag": "noindex"
      }
    });
  }
};

// ../AppData/Local/npm-cache/_npx/c943b712072b77c4/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../AppData/Local/npm-cache/_npx/c943b712072b77c4/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-H6i7W4/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// ../AppData/Local/npm-cache/_npx/c943b712072b77c4/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-H6i7W4/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
