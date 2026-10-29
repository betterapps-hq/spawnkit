import type { ServiceId } from "@spawn/templates/catalog"
import {
  ArrowUpRight,
  Check,
  CloudCheck,
  Gamepad2,
  KeyRound,
  Laptop,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  Trophy,
  UserRound
} from "lucide-react"

export function ServicePreview({ service }: { service: ServiceId }) {
  switch (service) {
    case "auth":
      return (
        <figure className="mk-service-preview mk-account-preview" aria-label="Player authentication example">
          <div className="mk-preview-bar">
            <UserRound size={15} />
            <span>Player profile</span>
            <span className="mk-preview-status">
              <Check size={12} /> Connected
            </span>
          </div>
          <div className="mk-player-profile">
            <span className="mk-player-avatar">F</span>
            <strong>Fern Explorer</strong>
            <small>fern@players.example</small>
          </div>
          <div className="mk-account-session">
            <KeyRound size={16} />
            <span>
              Email sign-in<strong>Verified account</strong>
            </span>
            <ShieldCheck size={17} />
          </div>
          <div className="mk-account-devices">
            <Laptop size={19} />
            <span>Same player profile</span>
            <Smartphone size={17} />
          </div>
        </figure>
      )
    case "saves":
      return (
        <figure className="mk-service-preview mk-save-preview" aria-label="Cloud saves example">
          <div className="mk-preview-bar">
            <CloudCheck size={15} />
            <span>Adventure save</span>
            <span className="mk-preview-status">Synced</span>
          </div>
          <div className="mk-save-scene">
            <img src="/examples/snake.webp" alt="" loading="lazy" />
            <span>
              <small>LAST CHECKPOINT</small>
              <strong>Orchard bridge</strong>
            </span>
          </div>
          <div className="mk-save-progress">
            <span>
              Level progress<strong>68%</strong>
            </span>
            <progress value={68} max={100} aria-label="Example saved level progress" />
          </div>
          <div className="mk-save-footer">
            <CloudCheck size={17} />
            <span>
              Saved to cloud<small>Version 8 / a few seconds ago</small>
            </span>
            <span className="mk-save-version">v8</span>
          </div>
        </figure>
      )
    case "leaderboards":
      return (
        <figure className="mk-service-preview mk-leaderboard-preview" aria-label="Leaderboards example">
          <div className="mk-preview-bar">
            <Trophy size={15} />
            <span>Orchard speedrun</span>
            <small>Season 4</small>
          </div>
          <div className="mk-leaderboard-title">
            <Trophy size={28} />
            <strong>Best runs this week</strong>
          </div>
          <ol>
            {[
              ["Fern", "2,450 points"],
              ["Clover", "2,180 points"],
              ["You", "1,920 points"],
              ["Moss", "1,840 points"]
            ].map(([name, score], index) => (
              <li key={name} data-you={name === "You"}>
                <span className="mk-ranking">{index + 1}</span>
                <span className="mk-rank-avatar">{name?.[0]}</span>
                <strong>{name}</strong>
                <span>{score}</span>
              </li>
            ))}
          </ol>
        </figure>
      )
    case "configs":
      return (
        <figure className="mk-service-preview mk-config-preview" aria-label="Live configuration example">
          <div className="mk-preview-bar">
            <Gamepad2 size={15} />
            <span>Weekend event</span>
            <span className="mk-preview-status">
              <Check size={12} /> Published
            </span>
          </div>
          <div className="mk-config-setting">
            <span>
              Bonus rewards<small>For this weekend’s runs</small>
            </span>
            <span className="mk-preview-switch">
              <Check size={11} />
            </span>
          </div>
          <div className="mk-config-setting">
            <span>Reward multiplier</span>
            <strong className="mk-config-value">2×</strong>
          </div>
          <div className="mk-config-range">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="mk-config-setting">
            <span>Round duration</span>
            <strong>
              120 <small>sec</small>
            </strong>
          </div>
          <div className="mk-preview-footer">
            <Check size={14} /> Config version 12 is live
          </div>
        </figure>
      )
    case "analytics":
      return (
        <figure className="mk-service-preview mk-analytics-preview" aria-label="Game analytics example">
          <div className="mk-preview-bar">
            <Gamepad2 size={15} />
            <span>Level completions</span>
            <small>Last 7 days</small>
          </div>
          <div className="mk-analytics-metric">
            <strong>1,284</strong>
            <span>
              <ArrowUpRight size={15} /> 18% this week
            </span>
          </div>
          <svg
            className="mk-service-chart"
            viewBox="0 0 300 105"
            aria-label="Example level completions increased during the week"
            aria-hidden="true"
          >
            <path d="M0 25H300M0 60H300M0 95H300" stroke="currentColor" opacity=".1" />
            <path
              d="M0 86L25 78L50 83L75 59L100 65L125 40L150 48L175 27L200 39L225 16L250 23L275 10L300 6V105H0Z"
              fill="currentColor"
              opacity=".12"
            />
            <path
              d="M0 86L25 78L50 83L75 59L100 65L125 40L150 48L175 27L200 39L225 16L250 23L275 10L300 6"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              strokeLinejoin="round"
            />
          </svg>
          <div className="mk-chart-days">
            <span>Mon</span>
            <span>Sun</span>
          </div>
          <div className="mk-preview-footer">
            <code>level.completed</code>
            <span>Orchard Trail</span>
          </div>
        </figure>
      )
    case "moderation":
      return (
        <figure className="mk-service-preview mk-moderation-preview" aria-label="Moderation example">
          <div className="mk-preview-bar">
            <ShieldCheck size={15} />
            <span>Team permissions</span>
          </div>
          <div className="mk-moderator-profile">
            <span className="mk-moderator-shield">
              <ShieldCheck size={30} />
            </span>
            <div>
              <strong>Community moderator</strong>
              <small>Orchard Trail</small>
            </div>
          </div>
          <div className="mk-permission">
            <Check size={15} />
            <span>Read player profiles</span>
            <small>Allowed</small>
          </div>
          <div className="mk-permission">
            <Check size={15} />
            <span>Manage player access</span>
            <small>Allowed</small>
          </div>
          <div className="mk-permission" data-restricted="true">
            <LockKeyhole size={15} />
            <span>Change team roles</span>
            <small>Admin only</small>
          </div>
        </figure>
      )
    case "notes":
      return (
        <figure className="mk-service-preview mk-notes-preview" aria-label="Player notes example">
          <div className="mk-preview-bar">
            <UserRound size={15} />
            <span>Fern Explorer</span>
            <small>Player notes</small>
          </div>
          <div className="mk-support-note">
            <span>
              <LockKeyhole size={12} /> Team only
            </span>
            <strong>Checkpoint recovery</strong>
            <p>
              Player reported a missing checkpoint after reconnecting. Previous save is intact. Asked them to resume
              from Orchard bridge.
            </p>
          </div>
          <div className="mk-note-author">
            <span className="mk-rank-avatar">J</span>
            <span>
              Jamie<small>Support team</small>
            </span>
            <small>Today, 10:42</small>
          </div>
        </figure>
      )
  }
}
