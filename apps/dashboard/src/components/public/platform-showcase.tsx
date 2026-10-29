import {
  ArrowLeft,
  ArrowRight,
  BatteryFull,
  Globe2,
  LockKeyhole,
  Maximize2,
  Monitor,
  RotateCw,
  Smartphone,
  Wifi
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import "./creator-workbench.css"

function PrismScreen() {
  return (
    <div className="c-prism-screen">
      <div className="c-prism-hud">
        <strong>PRISM BREAK</strong>
        <span>
          SCORE <b>240</b>
        </span>
      </div>
      <svg viewBox="0 0 600 360" fill="none" aria-hidden="true">
        <path d="M30 350V25H570V350" stroke="#bba0ff" strokeOpacity=".18" strokeWidth="2" />
        {Array.from({ length: 35 }, (_, index) => {
          const row = Math.floor(index / 7),
            column = index % 7
          if ((row === 4 && column > 1 && column < 5) || (row === 3 && column === 3)) return null
          return (
            <g key={index}>
              <rect
                x={49 + column * 73}
                y={45 + row * 29}
                width="65"
                height="21"
                rx="5"
                fill={["#b59aff", "#9984ed", "#6dbaad", "#68c7ce", "#e7b577"][row]}
              />
              <path
                d={"M" + (54 + column * 73) + " " + (49 + row * 29) + "h55"}
                stroke="white"
                strokeOpacity=".3"
                strokeLinecap="round"
              />
            </g>
          )
        })}
        <path d="M260 305L350 215L308 171" stroke="#c1a4ff" strokeOpacity=".3" strokeWidth="2" strokeDasharray="5 7" />
        <circle cx="350" cy="215" r="16" fill="#c6b2ff" fillOpacity=".09" />
        <circle cx="350" cy="215" r="7" fill="#f2ebff" />
        <rect x="211" y="314" width="100" height="12" rx="6" fill="#ad92f4" />
        <rect x="224" y="316" width="74" height="3" rx="1.5" fill="#e6d6ff" />
      </svg>
      <div className="c-prism-bottom">
        <span>LEVEL 02</span>
        <span>MOVE TO CATCH THE BALL</span>
      </div>
    </div>
  )
}

export function PlatformShowcase() {
  return (
    <section className="p-platform-showcase c-platform-showcase" aria-labelledby="platform-title">
      <div className="c-platform-heading">
        <span className="mk-eyebrow">BUILT FOR THE WEB</span>
        <h2 id="platform-title">A browser is all your players need.</h2>
        <p>Bring your game to desktop and mobile browsers. Share a link with your players and let them jump in.</p>
      </div>
      <figure
        className="c-device-composition"
        aria-label="Prism Break running in a laptop browser and a mobile browser"
      >
        <div className="c-device-glow" />
        <div className="c-laptop">
          <div className="c-laptop-lid">
            <span className="c-device-camera" />
            <div className="c-browser-toolbar">
              <ArrowLeft size={12} />
              <ArrowRight size={12} />
              <RotateCw size={12} />
              <span>
                <LockKeyhole size={10} />
                prism-break.spawnkit.games
              </span>
              <Maximize2 size={11} />
            </div>
            <PrismScreen />
            <span className="c-laptop-wordmark">SpawnKit</span>
          </div>
          <div className="c-laptop-deck">
            <div className="c-laptop-keyboard">
              {Array.from({ length: 60 }, (_, index) => (
                <i key={index} />
              ))}
            </div>
            <span className="c-trackpad" />
          </div>
          <div className="c-laptop-lip">
            <i />
          </div>
        </div>
        <div className="c-phone">
          <div className="c-phone-screen">
            <div className="c-phone-status">
              <span>9:41</span>
              <i />
              <Wifi size={11} />
              <BatteryFull size={14} />
            </div>
            <PrismScreen />
            <div className="c-phone-address">
              <LockKeyhole size={10} />
              prism-break.spawnkit.games
            </div>
            <span className="c-phone-home" />
          </div>
          <span className="c-phone-side" />
        </div>
        <span className="c-device-caption">
          <Globe2 size={14} />
          Prism Break
        </span>
      </figure>
      <div className="c-platform-details">
        <div className="c-web-offer">
          <Globe2 size={22} />
          <div>
            <h3>Web games</h3>
            <p>Start with a kit, develop locally, and host your game on SpawnKit Cloud or your own infrastructure.</p>
            <a className="mk-secondary" href="/browse">
              Play Prism Break <ArrowRight size={16} />
            </a>
          </div>
        </div>
        <div className="c-native-roadmap">
          <p>Native exports are on the roadmap.</p>
          <div>
            <Monitor size={17} />
            <strong>Desktop games</strong>
            <Badge variant="outline">Coming soon</Badge>
          </div>
          <div>
            <Smartphone size={17} />
            <strong>Mobile apps</strong>
            <Badge variant="outline">Coming soon</Badge>
          </div>
        </div>
      </div>
    </section>
  )
}
