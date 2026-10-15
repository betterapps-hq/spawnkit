import { Database, Globe2, HardDrive, Server, Zap } from "lucide-react"
import { Button } from "../../ui/button"
import type { DeploymentConfiguration, ResourceSettings } from "./configuration"

export function Infrastructure({
  settings,
  configuration,
  onOpen
}: {
  settings: ResourceSettings
  configuration: DeploymentConfiguration
  onOpen: (resource: string) => void
}) {
  const regions = Object.entries(settings.regions)
  const count = regions.reduce((sum, [, value]) => sum + value, 0)
  const hasData = configuration.database || configuration.assets
  return (
    <div className="dm-inline-infrastructure nodrag nopan">
      <Button
        variant="outline"
        className="dm-infra-client"
        onClick={(event) => {
          event.stopPropagation()
          onOpen("Game client")
        }}
      >
        <Globe2 />
        <span>Game client</span>
        <span className="ml-auto text-xs font-normal text-muted-foreground">Global edge</span>
      </Button>
      {(configuration.servers || configuration.api) && <div className="dm-infra-stem" aria-hidden="true" />}
      {configuration.servers && (
        <Button
          variant="outline"
          className="dm-infra-servers"
          onClick={(event) => {
            event.stopPropagation()
            onOpen("Game servers")
          }}
        >
          <span className="dm-infra-resource-title">
            <Server />
            <span>Game servers</span>
            <span className="ml-auto text-xs font-normal text-muted-foreground">{count}×</span>
          </span>
          <span className="dm-infra-regions">
            {regions.slice(0, 3).map(([city, instances]) => (
              <span className="dm-infra-region" key={city}>
                <span>
                  <i />
                  {city}
                </span>
                <span>{instances}×</span>
              </span>
            ))}
            {regions.length > 3 && (
              <span className="text-left text-xs font-normal text-muted-foreground">+{regions.length - 3} regions</span>
            )}
          </span>
        </Button>
      )}
      {configuration.api && (
        <Button
          variant="outline"
          className="dm-infra-client"
          onClick={(event) => {
            event.stopPropagation()
            onOpen("API")
          }}
        >
          <Zap />
          <span>API</span>
          <span className="ml-auto text-xs font-normal text-muted-foreground">Edge function</span>
        </Button>
      )}
      {hasData && (
        <>
          {configuration.database && configuration.assets ? (
            <svg className="dm-infra-branches" viewBox="0 0 300 26" preserveAspectRatio="none" aria-hidden="true">
              <path d="M150 0V8Q150 13 145 13H80Q75 13 75 18V26M150 8Q150 13 155 13H220Q225 13 225 18V26" />
            </svg>
          ) : (
            <div className="dm-infra-stem" aria-hidden="true" />
          )}
          <div
            className={`dm-infra-data ${configuration.database && configuration.assets ? "" : "dm-infra-data-single"}`}
          >
            {configuration.database && (
              <Button
                variant="outline"
                onClick={(event) => {
                  event.stopPropagation()
                  onOpen("Database")
                }}
              >
                <span className="dm-infra-resource-title">
                  <Database />
                  {configuration.database === "neon" ? "Neon Postgres" : "Database"}
                </span>
                <span className="text-xs font-normal text-muted-foreground">{settings.database}</span>
              </Button>
            )}
            {configuration.assets && (
              <Button
                variant="outline"
                onClick={(event) => {
                  event.stopPropagation()
                  onOpen("Asset storage")
                }}
              >
                <span className="dm-infra-resource-title">
                  <HardDrive />
                  Assets
                </span>
                <span className="text-xs font-normal text-muted-foreground">2.4 GB · Global</span>
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
