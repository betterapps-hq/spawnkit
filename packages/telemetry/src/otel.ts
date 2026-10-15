import type { LogRecordExporter, ReadableLogRecord } from "@opentelemetry/sdk-logs"
import type { Telemetry } from "./index.js"
import { cleanAttributes, cleanText } from "./protocol.js"
import type { Level } from "./protocol.js"

/** Attach to an OpenTelemetry SimpleLogRecordProcessor; SpawnKit owns batching/retries. */
export function createOtelLogExporter(telemetry: Telemetry): LogRecordExporter {
  return {
    export(records: ReadableLogRecord[], callback) {
      try {
        for (const record of records) {
          const levels: Level[] = ["trace", "debug", "info", "warn", "error", "fatal"]
          const level = levels[Math.max(0, Math.min(5, Math.floor(((record.severityNumber ?? 9) - 1) / 4)))]!
          telemetry.emit({
            level,
            name:
              record.eventName ??
              (typeof record.attributes["event.name"] === "string" ? record.attributes["event.name"] : "log"),
            body: typeof record.body === "string" ? cleanText(record.body, 2048) : "Structured OpenTelemetry log",
            attributes: {
              ...cleanAttributes(record.attributes, 28),
              "otel.scope.name": cleanText(record.instrumentationScope.name, 128),
              "otel.scope.version": cleanText(record.instrumentationScope.version ?? "", 64)
            },
            time: record.hrTime[0] * 1000 + record.hrTime[1] / 1e6,
            ...(record.spanContext ? { trace: record.spanContext } : {})
          })
        }
        callback({ code: 0 })
      } catch {
        callback({ code: 1, error: new Error("Telemetry export failed") })
      }
    },
    async forceFlush() {
      await telemetry.flush()
    },
    async shutdown() {
      await telemetry.shutdown()
    }
  }
}
