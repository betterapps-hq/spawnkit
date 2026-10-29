import { createFileRoute } from "@tanstack/react-router"
import { TeamInvitationPage } from "../components/moderation/team-invitation"
export const Route = createFileRoute("/team/invitation")({ component: TeamInvitationPage })
