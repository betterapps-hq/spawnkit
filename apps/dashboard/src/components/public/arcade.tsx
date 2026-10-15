import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Pause, Play, RotateCcw } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

type Point = { x: number; y: number }
const width = 640
const height = 400
export function Arcade({ game }: { game: string }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const pausedRef = useRef(false)
  const input = useRef<(key: string, pressed: boolean) => void>(() => {})
  const move = useRef<(x: number) => void>(() => {})
  const [round, setRound] = useState(0)
  const [paused, setPaused] = useState(false)
  const [score, setScore] = useState(0)
  const [ended, setEnded] = useState(false)
  const [won, setWon] = useState(false)
  function pause(value: boolean) {
    pausedRef.current = value
    setPaused(value)
  }
  function restart() {
    pause(false)
    setRound((value) => value + 1)
  }
  useEffect(() => {
    const element = canvas.current
    const ctx = element?.getContext("2d")
    if (!ctx || !element) return
    setScore(0)
    setEnded(false)
    setWon(false)
    element.focus()
    let frame = 0
    let last = 0
    let points = 0
    let over = false
    const keys = new Set<string>()
    let direction: Point = { x: 1, y: 0 }
    let nextDirection = direction
    const snake: Point[] = [
      { x: 12, y: 10 },
      { x: 11, y: 10 },
      { x: 10, y: 10 }
    ]
    let apple: Point = { x: 20, y: 10 }
    let tick = 0
    let player = 320
    let pointer: number | null = null
    const ball = { x: 320, y: 300, vx: 175, vy: -230 }
    const bricks = Array.from({ length: 40 }, (_, i) => ({
      x: 24 + (i % 10) * 60,
      y: 40 + Math.floor(i / 10) * 28,
      alive: true
    }))
    let spawn = 0
    let fire = 0
    let enemies: Point[] = []
    let bullets: Point[] = []
    function finish(victory = false) {
      over = true
      setEnded(true)
      setWon(victory)
    }
    function addScore(amount: number) {
      points += amount
      setScore(points)
    }
    input.current = (key, pressed) => {
      if (pressed) keys.add(key)
      else keys.delete(key)
      if (!pressed) return
      pointer = null
      const requested: Record<string, Point> = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        w: { x: 0, y: -1 },
        s: { x: 0, y: 1 },
        a: { x: -1, y: 0 },
        d: { x: 1, y: 0 }
      }
      const next = requested[key]
      if (next && !(next.x === -direction.x && next.y === -direction.y)) nextDirection = next
    }
    move.current = (x) => {
      pointer = x
    }
    function visibility() {
      if (document.hidden) pause(true)
    }
    document.addEventListener("visibilitychange", visibility)
    function update(dt: number) {
      if (game === "snake") {
        tick += dt
        if (tick < 0.15) return
        tick = 0
        direction = nextDirection
        const head = { x: snake[0]!.x + direction.x, y: snake[0]!.y + direction.y }
        const eats = head.x === apple.x && head.y === apple.y
        if (
          head.x < 0 ||
          head.x >= 32 ||
          head.y < 0 ||
          head.y >= 20 ||
          snake.slice(0, eats ? snake.length : -1).some((piece) => piece.x === head.x && piece.y === head.y)
        ) {
          finish()
          return
        }
        snake.unshift(head)
        if (eats) {
          addScore(10)
          const free = Array.from({ length: 640 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32) })).filter(
            (cell) => !snake.some((piece) => piece.x === cell.x && piece.y === cell.y)
          )
          if (!free.length) {
            finish(true)
            return
          }
          apple = free[Math.floor(Math.random() * free.length)]!
        } else snake.pop()
        return
      }
      if (pointer !== null) player = pointer
      else
        player +=
          ((keys.has("ArrowRight") || keys.has("d") ? 1 : 0) - (keys.has("ArrowLeft") || keys.has("a") ? 1 : 0)) *
          400 *
          dt
      player = Math.max(48, Math.min(width - 48, player))
      if (game === "breakout") {
        ball.x += ball.vx * dt
        ball.y += ball.vy * dt
        if (ball.x <= 8 || ball.x >= width - 8) {
          ball.x = Math.max(8, Math.min(width - 8, ball.x))
          ball.vx *= -1
        }
        if (ball.y <= 8) {
          ball.y = 8
          ball.vy = Math.abs(ball.vy)
        }
        if (ball.vy > 0 && ball.y >= 356 && ball.y <= 375 && Math.abs(ball.x - player) <= 56) {
          ball.y = 355
          ball.vy = -Math.abs(ball.vy)
          ball.vx = (ball.x - player) * 5
        }
        for (const brick of bricks) {
          if (
            brick.alive &&
            ball.x + 7 >= brick.x &&
            ball.x - 7 <= brick.x + 54 &&
            ball.y + 7 >= brick.y &&
            ball.y - 7 <= brick.y + 20
          ) {
            brick.alive = false
            ball.vy *= -1
            addScore(10)
            break
          }
        }
        if (ball.y > height + 10) finish()
        if (bricks.every((brick) => !brick.alive)) finish(true)
      } else {
        spawn += dt
        fire += dt
        if (spawn > 0.65) {
          spawn = 0
          enemies.push({ x: 25 + Math.random() * 590, y: -20 })
        }
        if (fire > 0.18) {
          fire = 0
          bullets.push({ x: player, y: 338 })
        }
        enemies.forEach((enemy) => {
          enemy.y += (75 + Math.min(points, 300) / 8) * dt
        })
        bullets.forEach((bullet) => {
          bullet.y -= 420 * dt
        })
        for (const enemy of enemies) {
          const bullet = bullets.find((item) => Math.abs(item.x - enemy.x) < 22 && Math.abs(item.y - enemy.y) < 20)
          if (bullet) {
            enemy.y = 500
            bullet.y = -50
            addScore(10)
          } else if (Math.abs(enemy.x - player) < 28 && Math.abs(enemy.y - 350) < 26) finish()
        }
        enemies = enemies.filter((enemy) => enemy.y < height + 30)
        bullets = bullets.filter((bullet) => bullet.y > -20)
      }
    }
    function draw(context: CanvasRenderingContext2D) {
      context.fillStyle = game === "snake" ? "#11291d" : "#111421"
      context.fillRect(0, 0, width, height)
      context.strokeStyle = game === "snake" ? "#1b3827" : "#202438"
      context.lineWidth = 1
      for (let x = 0; x <= width; x += 20) {
        context.beginPath()
        context.moveTo(x, 0)
        context.lineTo(x, height)
        context.stroke()
      }
      for (let y = 0; y <= height; y += 20) {
        context.beginPath()
        context.moveTo(0, y)
        context.lineTo(width, y)
        context.stroke()
      }
      if (game === "snake") {
        snake.forEach((piece, i) => {
          context.fillStyle = i === 0 ? "#e0ff8e" : `hsl(${105 - Math.min(i, 20)}, 65%, ${58 - Math.min(i, 20)}%)`
          context.beginPath()
          context.roundRect(piece.x * 20 + 2, piece.y * 20 + 2, 16, 16, 5)
          context.fill()
        })
        context.fillStyle = "#ff7b73"
        context.beginPath()
        context.arc(apple.x * 20 + 10, apple.y * 20 + 10, 7, 0, Math.PI * 2)
        context.fill()
        context.fillStyle = "#c9f577"
        context.fillRect(apple.x * 20 + 10, apple.y * 20, 5, 4)
      } else if (game === "breakout") {
        bricks.forEach((brick, i) => {
          if (!brick.alive) return
          context.fillStyle = ["#c1a1ff", "#82c9ff", "#e7a8dd", "#c1ef83"][Math.floor(i / 10)]!
          context.beginPath()
          context.roundRect(brick.x, brick.y, 54, 20, 4)
          context.fill()
        })
        context.fillStyle = "#c7f57c"
        context.beginPath()
        context.roundRect(player - 48, 364, 96, 10, 5)
        context.fill()
        context.fillStyle = "#ffffff"
        context.beginPath()
        context.arc(ball.x, ball.y, 7, 0, Math.PI * 2)
        context.fill()
      } else {
        context.fillStyle = "#c7f57c"
        context.beginPath()
        context.moveTo(player, 331)
        context.lineTo(player - 18, 368)
        context.lineTo(player, 360)
        context.lineTo(player + 18, 368)
        context.closePath()
        context.fill()
        context.fillStyle = "#f0c777"
        bullets.forEach((bullet) => context.fillRect(bullet.x - 2, bullet.y, 4, 12))
        enemies.forEach((enemy) => {
          context.fillStyle = "#c7a3fd"
          context.beginPath()
          context.moveTo(enemy.x - 16, enemy.y - 12)
          context.lineTo(enemy.x, enemy.y + 15)
          context.lineTo(enemy.x + 16, enemy.y - 12)
          context.lineTo(enemy.x, enemy.y - 4)
          context.closePath()
          context.fill()
        })
      }
    }
    function loop(now: number) {
      const dt = Math.min(last ? (now - last) / 1000 : 0, 0.032)
      last = now
      if (!pausedRef.current && !over) update(dt)
      draw(ctx!)
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener("visibilitychange", visibility)
      input.current = () => {}
      move.current = () => {}
    }
  }, [game, round])
  const controls = game === "snake" ? ["ArrowLeft", "ArrowUp", "ArrowDown", "ArrowRight"] : ["ArrowLeft", "ArrowRight"]
  const controlIcons = { ArrowLeft, ArrowUp, ArrowDown, ArrowRight }
  return (
    <div
      className="p-arcade"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) pause(true)
      }}
    >
      <div className="p-arcade-toolbar">
        <span>ARCADE DEMO</span>
        <b aria-live="polite">Score: {score}</b>
        <Button aria-label={paused ? "Resume game" : "Pause game"} disabled={ended} onClick={() => pause(!paused)}>
          {paused ? <Play size={18} /> : <Pause size={18} />}
        </Button>
        <Button aria-label="Restart game" onClick={restart}>
          <RotateCcw size={18} />
        </Button>
      </div>
      <div className="p-canvas-wrap">
        <canvas
          ref={canvas}
          width={width}
          height={height}
          tabIndex={0}
          aria-label={`${game === "snake" ? "Snake" : game === "breakout" ? "Brick breaker" : "Space shooter"} game. Use arrow keys or the controls below.`}
          onKeyDown={(event) => {
            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(event.key)) {
              event.preventDefault()
              input.current(event.key, true)
            }
            if (event.code === "Space") {
              event.preventDefault()
              pause(!paused)
            }
          }}
          onKeyUp={(event) => input.current(event.key, false)}
          onPointerMove={(event) => {
            if (game !== "snake") {
              const rect = event.currentTarget.getBoundingClientRect()
              move.current(((event.clientX - rect.left) / rect.width) * width)
            }
          }}
          onPointerDown={(event) => {
            event.currentTarget.focus()
            if (game !== "snake") {
              const rect = event.currentTarget.getBoundingClientRect()
              move.current(((event.clientX - rect.left) / rect.width) * width)
            }
          }}
        />
        {(ended || paused) && (
          <div className="p-game-overlay">
            <h2>{ended ? (won ? "You cleared it!" : "One more round?") : "Take your time."}</h2>
            <p>{ended ? `You scored ${score} points.` : "Your game is paused."}</p>
            <Button
              className="p-button"
              onClick={() => {
                if (ended) restart()
                else {
                  pause(false)
                  canvas.current?.focus()
                }
              }}
            >
              {ended ? "Play again" : "Resume game"}
              <Play size={17} />
            </Button>
          </div>
        )}
      </div>
      <div className="p-game-controls">
        {controls.map((key) => {
          const Icon = controlIcons[key as keyof typeof controlIcons]
          return (
            <Button
              key={key}
              aria-label={`Move ${key.replace("Arrow", "").toLowerCase()}`}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId)
                input.current(key, true)
              }}
              onPointerUp={() => input.current(key, false)}
              onPointerCancel={() => input.current(key, false)}
              onKeyDown={(event) => {
                if (event.key === " " || event.key === "Enter") input.current(key, true)
              }}
              onKeyUp={() => input.current(key, false)}
            >
              <Icon size={22} />
            </Button>
          )
        })}
        <span>
          {game === "snake"
            ? "Collect fruit. Avoid your trail."
            : game === "breakout"
              ? "Move the paddle. Clear every brick."
              : "Dodge the fleet. Your ship fires automatically."}
        </span>
      </div>
    </div>
  )
}
