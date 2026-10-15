import type { Meta, StoryObj } from "@storybook/react-vite"
import { useEffect, useRef } from "react"
import { LoginScene } from "./login-scene"

function ScenePreview({ motion }: { motion: "animated" | "paused" | "reduced" }) {
  const preview = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (motion !== "paused") return
    for (const animation of preview.current?.getAnimations({ subtree: true }) ?? []) {
      animation.pause()
      animation.currentTime = 1200
    }
  }, [motion])

  return (
    <div className="login-scene-preview" data-motion={motion} ref={preview}>
      <style>{`
        .login-scene-preview .login-scene { display: grid; min-height: 100svh; border: 0; }
        .login-scene-preview[data-motion="paused"] *,
        .login-scene-preview[data-motion="paused"] *::before,
        .login-scene-preview[data-motion="paused"] *::after { animation-play-state: paused !important; }
        .login-scene-preview[data-motion="reduced"] *,
        .login-scene-preview[data-motion="reduced"] *::before,
        .login-scene-preview[data-motion="reduced"] *::after { animation: none !important; transition: none !important; }
        .login-scene-preview:not([data-motion="animated"]) .login-scene { pointer-events: none; }
      `}</style>
      <LoginScene key={motion} />
    </div>
  )
}

const meta = {
  title: "Authentication/Login scene",
  component: ScenePreview,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "The live login illustration, built with HTML and CSS. Move the pointer near characters to catch their eye, lift loose tiles, and nudge floating sparks. The water shimmers. Separate routes and raised hops keep characters clear of each other and the terrain; enemies collect two respawning gems per lap. No canvas, WebGL, or WebGPU is required. This isolated preview stays visible at all widths; sign-in hides the illustration below 1024px. System reduced-motion preferences also disable the animated preview and pointer effects."
      }
    }
  },
  args: { motion: "animated" },
  argTypes: { motion: { control: "inline-radio", options: ["animated", "paused", "reduced"] } }
} satisfies Meta<typeof ScenePreview>

export default meta
type Story = StoryObj<typeof meta>

export const Animated: Story = {}
export const Paused: Story = { args: { motion: "paused" } }
export const ReducedMotion: Story = { args: { motion: "reduced" } }
