-- Prompt 16 (continuación): aislamiento de conversaciones del canal webchat
-- por sesión. Los visitantes del widget web ya no comparten conversación.

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "sessionKey" TEXT;
