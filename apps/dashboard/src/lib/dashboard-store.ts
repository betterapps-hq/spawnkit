import { create } from "zustand"
import type { StudioLocation } from "@/components/project/model"

// One navigation store per rendered shell; never shared across SSR requests.
export const createDashboardStore = (location: StudioLocation) =>
  create<{
    location: StudioLocation
    navigate: (next: StudioLocation) => void
  }>((set) => ({ location, navigate: (next) => set({ location: next }) }))
