# SpawnKit Telemetry

Structured game events, leveled logs, errors with breadcrumbs, measurements and OpenTelemetry log correlation. Browser and Node 24+; no runtime dependencies. Pack with `pnpm pack`, then install the tarball. Registry publication is not required by generated games: the CLI embeds this same built package under `vendor/spawn-telemetry`.

```ts
import { createTelemetry } from "@spawn/telemetry"
const telemetry = createTelemetry({
  endpoint: "https://YOUR-TELEMETRY-HOST/v1/logs",
  key: "PUBLIC_PROJECT_WRITE_KEY",
  serviceName: "my-game",
  environment: "production",
  release: "1.0.0",
  consent: "denied"
})
// Only after the application's consent/collection policy allows capture:
telemetry.setConsent("granted")
telemetry.installBrowserHandlers()
telemetry.addBreadcrumb("Level entered", { level: 2 })
telemetry.track("level.completed", { level: 2, score: 100 })
telemetry.measure("frame.duration", 16.6, "ms")
telemetry.captureException(new Error("Save failed"))
await telemetry.flush()
await telemetry.shutdown()
```

The key is public write-only configuration. Never provide a Cloudflare token, Clerk credential, or admin key. Server project/environment scope is authoritative. Browser origins must be explicitly allowed by the owner. No identity, cookies, local storage, DOM contents, request bodies, or session replay are collected. A random in-memory session ID changes on consent withdrawal or `resetSession()`.

`setContext` sets bounded shared application context. On servers pass request attributes/trace context on each call; never put request/user state in shared context. Capture methods accept `{ traceId, spanId, traceFlags }` from an OpenTelemetry span. No global provider is installed. Measurements are log events, not OTLP metrics; correlated logs do not export spans.

`beforeSend` is synchronous. Returning null or throwing drops the record. Sanitization runs before and after the hook. IDs, capture time, kind and severity cannot change. Attributes accept scalar values only. Redaction is best effort: keep personal data and secrets out of messages and attributes. Oversize/full-queue drops increment counters. `stats()` reports sent, queued, dropped, retries and last HTTP status.

Flush sends records present when it starts within its deadline; retries become eligible on a later flush or interval. Delivery is best effort, memory-only, with deduplicated retry IDs. Defaults: 200 records/256 KiB buffered, 20 records/48 KiB per request, five-minute age, three retries, five-second interval/timeout. HTTP 429/502/503/504 and network failures retry with jitter and Retry-After; other errors drop the batch. Consent revocation clears unsent data and aborts active transport. Already accepted data follows server retention. Pagehide sends at most one small keepalive batch. Await flush/shutdown in server shutdown hooks; in Workers attach it to request lifetime using waitUntil.

OpenTelemetry integration (install `@opentelemetry/sdk-logs`, tested at 0.223.0):

```ts
import { LoggerProvider, SimpleLogRecordProcessor } from "@opentelemetry/sdk-logs"
import { createOtelLogExporter } from "@spawn/telemetry/otel"
const provider = new LoggerProvider({
  processors: [new SimpleLogRecordProcessor({ exporter: createOtelLogExporter(telemetry) })]
})
provider.getLogger("game").emit({ body: "Level ready", severityNumber: 9 })
await provider.forceFlush()
await telemetry.flush()
```

The adapter uses the SpawnKit instance's service/release/environment. It forwards scalar attributes, severity, timestamps, event names and span context; nested bodies become a summary. Application-specific resource/scope metadata can be supplied as bounded context. The exporter callback acknowledges admission to the local buffer; `flush()` reports cumulative sent/dropped and remaining queue counts. Generic OTLP/JSON clients can POST with `x-spawn-key`; stable `spawn.event.id` enables retry deduplication. Without it the server generates IDs and repeated requests can duplicate logs. The receiver ignores unknown fields, discards nested AnyValues, and rejects invalid sizes/timestamps atomically.

Each project/environment has seven-day application retention, 10,000 new records per UTC day, 60 ingestion requests/minute and 30 reads/configuration operations/minute. Use sampleRate for events and errorSampleRate for errors. High-volume analytics needs a future sharded tier. Rotation immediately invalidates old keys: update configuration and redeploy. Deletion disables capture and clears visible records; recovery copies follow Cloudflare PITR retention.
