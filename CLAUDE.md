## Workboard

- Cada vez que termines una tarea listada en `WORKBOARD.md`, edítalo y marca esa tarea como completada (cambia `[ ]` a `[x]`).
- Hazlo inmediatamente al terminar la tarea, no al final de la sesión.
- Antes de implementar cualquier tarea del `WORKBOARD.md`, consulta `PLANNING.md` y basa los cambios en lo que ahí se especifica.

## Resumen de estado por fase (actualizar al acabar cada fase)

Al terminar cada fase, actualiza la tabla de abajo con los archivos modificados, decisiones clave y lo que queda pendiente. Esto permite retomar rápidamente en la siguiente sesión.

| Fase | Estado | Archivos clave | Notas |
|------|--------|----------------|-------|
| 1 — Fundación | ✅ | `main.tsx`, `App.tsx`, `lib/axios.ts`, `lib/socket.ts`, `store/authStore.ts`, `routes/` | Auth completo con JWT + refresh. Login/Register con zod. |
| 2 — ChatList + ChatWindow + STOMP | ✅ | `store/chatStore.ts`, `hooks/useSocket.ts`, `features/chat/components/ChatList.tsx`, `ChatWindow.tsx`, `MessageBubble.tsx`, `NewChatModal.tsx` | STOMP conectado. Paginación cursor-based. ChatSocketEvent discriminado. |
| 3 — Mensajería avanzada | ✅ | `types/chat.ts`, `store/chatStore.ts`, `hooks/useSocket.ts`, `features/chat/components/MessageBubble.tsx`, `ChatWindow.tsx`, `ReplyPreview.tsx`, `features/chat/api.ts` | Ver detalle abajo. |
| 4 — Pin, Star, Forward, Search | 🔲 | — | — |
| 5 — Multimedia | 🔲 | — | — |
| 6 — Llamadas WebRTC | 🔲 | — | — |
| 7 — Grupos | 🔲 | — | — |
| 8 — Personalización | 🔲 | — | — |
| 9 — Privacidad y notificaciones | 🔲 | — | — |

---

## Fase 3 — Detalle de implementación

### Nuevos tipos (`src/types/chat.ts`)
- `MessageType` — unión de tipos de contenido de mensaje
- `MessageDTO.deliveredTo: number[]` — IDs de usuarios a quienes fue entregado
- `ChatDTO.otherUserId?: number` — ID del otro usuario en chats privados (pendiente de backend)
- `ChatSocketEvent` — unión discriminada completa:
  - `MESSAGE_NEW`, `MESSAGE_EDITED`, `MESSAGE_DELETED`
  - `REACTION_ADDED`, `REACTION_REMOVED`
  - `TYPING_START`, `TYPING_STOP`
  - `USER_ONLINE`, `USER_OFFLINE`
  - `MESSAGE_DELIVERED`, `MESSAGE_READ`

### chatStore (`src/store/chatStore.ts`)
Estado nuevo:
- `presence: Record<userId, { isOnline, lastSeen }>` — presencia online/offline
- `typing: Record<chatId, { userId, userName }[]>` — quién está escribiendo
- `replyTo: Message | null` — mensaje al que se responde
- `editingMessage: Message | null` — mensaje en edición

Acciones nuevas:
- `editMessage`, `deleteMessage`, `addReaction`, `removeReaction`
- `markDelivered`, `markRead`, `setPresence`, `setTyping`
- `setReplyTo`, `setEditingMessage`

Helper `mapAllMessages` para aplicar un updater sobre todos los mensajes de todos los chats.

### useSocket (`src/hooks/useSocket.ts`)
- `useSocket()` ahora suscribe a `/topic/presence` y `/user/queue/messages` (entrega)
- `useChatSubscription(chatId)` maneja todos los eventos del chat + suscribe a `.typing` y `.read` topics
- `publishTypingStart(chatId, userId, userName)` — función helper exportada
- `publishTypingStop(chatId, userId)` — función helper exportada

### API (`src/features/chat/api.ts`)
Métodos nuevos: `editMessage`, `deleteMessage`, `markRead`, `addReaction`, `removeReaction`, `starMessage`, `unstarMessage`

### MessageBubble (`src/features/chat/components/MessageBubble.tsx`)
Props nuevas: `onReply`, `onEdit`, `onDelete`, `onReact`
- Ticks de estado: `Ticks` component con SVG (sent/delivered/read)
- Menú contextual a `position: fixed` (calculado desde `getBoundingClientRect`) — no se corta por `overflow:auto`
- Emoji picker a `position: fixed` via `emoji-picker-react` (EmojiClickData API)
- Reacciones debajo de la burbuja con toggle (click en reacción ya puesta la quita)
- Quote de respuesta con borde izquierdo

### ChatWindow (`src/features/chat/components/ChatWindow.tsx`)
- Typing indicator animado con 3 puntos bounce
- `publishTypingStart` debounced (3s inactividad → `publishTypingStop`)
- Modo reply: `ReplyPreview` sobre el input
- Modo edición: banner amarillo + botón checkmark en lugar de enviar
- Dialog de eliminar: "Para todos" / "Para mí" / Cancelar
- Escape cancela edición/reply
- Presencia en header: "en línea" / "visto hace X" (requiere `ChatDTO.otherUserId` del backend)

### ReplyPreview (`src/features/chat/components/ReplyPreview.tsx`)
Componente nuevo — banner sobre el input con nombre del autor y preview del contenido.

### Pendiente de backend para fase 3
- `ChatDTO.otherUserId` en la respuesta de `/api/chats` para mostrar presencia en header
- Emitir `MESSAGE_DELIVERED` a `/user/queue/messages` cuando el destinatario conecta
- Emitir `MESSAGE_READ` a `/topic/chat.{chatId}.read` al marcar como leído
- Emitir `TYPING_START`/`TYPING_STOP` a `/topic/chat.{chatId}.typing` al recibirlos de un cliente

---

## Instrucción para Claude

Al acabar cada fase, actualiza obligatoriamente:
1. La tabla de estado de fases en este `CLAUDE.md`
2. La sección de detalle de la fase recién terminada
3. El `WORKBOARD.md` marcando todas las tareas completadas con `[x]`
