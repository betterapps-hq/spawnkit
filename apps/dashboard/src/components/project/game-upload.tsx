import { useQueryClient } from "@tanstack/react-query"
import { UploadGamePreview } from "../moderation/design/upload-game-preview"
export function GameUpload() {
  const client = useQueryClient()
  return (
    <UploadGamePreview
      live
      onProjectCreated={() => {
        void client.invalidateQueries({ queryKey: ["projects"] })
      }}
    />
  )
}
