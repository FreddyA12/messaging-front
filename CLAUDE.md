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
| 4 — Pin, Star, Forward, Search | ✅ | `types/chat.ts`, `store/chatStore.ts`, `hooks/useSocket.ts`, `features/chat/api.ts`, `MessageBubble.tsx`, `ChatWindow.tsx`, `PinnedMessageBanner.tsx`, `StarredMessagesView.tsx`, `ForwardDialog.tsx` | Ver detalle abajo. |
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

---

## Referencia rápida de arquitectura (para nuevas sesiones)

### Stack y convenciones
- React 18 + TypeScript strict + Vite + Tailwind CSS (sin CSS modules)
- Zustand (`src/store/`) para estado global; React Query para cache REST
- Zod + react-hook-form en formularios; sin `any` en TypeScript
- Commits semánticos: `feat:`, `fix:`, `chore:`, `refactor:`

### Archivos clave por dominio
| Dominio | Archivo | Qué hace |
|---------|---------|----------|
| Tipos globales de chat | `src/types/chat.ts` | `MessageDTO`, `ChatDTO`, `ChatSocketEvent` (unión discriminada), todos los event types WS |
| Estado global de chat | `src/store/chatStore.ts` | `Message` (tipo store), `ChatListItem`, `useChatStore`. Estado: `chats`, `messages`, `presence`, `typing`, `replyTo`, `editingMessage`, `pinnedMessages`, `starredMessages` |
| Estado de auth | `src/store/authStore.ts` | `useAuthStore` — `user`, `token`, persist en localStorage |
| API REST | `src/features/chat/api.ts` | `chatApi.*` — todos los endpoints REST del chat |
| WebSocket | `src/lib/socket.ts` | `connectSocket`, `disconnectSocket`, `subscribe`, `publish` (STOMP) |
| Hooks WS | `src/hooks/useSocket.ts` | `useSocket()` (presencia+entrega), `useChatSubscription(chatId)`, `publishTypingStart/Stop` |
| HTTP client | `src/lib/axios.ts` | instancia `api` con interceptor JWT + refresh automático |
| Componentes chat | `src/features/chat/components/` | `ChatList`, `ChatWindow`, `MessageBubble`, `NewChatModal`, `ReplyPreview` |

### Modelo de datos principal
```
Message (store) = MessageDTO (API) con mismos campos:
  id, chatId, senderId, senderName, content, type, createdAt, editedAt,
  deletedForEveryone, replyTo (Message|null), isForwarded, reactions (ReactionGroup[]),
  readBy (number[]), deliveredTo (number[]),
  isPinned (bool), isStarred (bool)   ← añadidos en fase 4
```

### Patrones de implementación establecidos
- Menú contextual y emoji picker de MessageBubble usan `position:fixed` + `getBoundingClientRect()` para no cortarse por `overflow:auto`
- Paginación cursor-based con `IntersectionObserver` en sentinela al tope de la lista
- `flex-col-reverse` en el contenedor de mensajes para anclar al fondo
- `mapAllMessages(messages, updater)` helper en chatStore para aplicar un cambio a todos los mensajes de todos los chats

### Endpoints REST (base `/api`)
```
GET    /chats                          → ChatDTO[]
POST   /chats                          → ChatDTO  (body: { userId })
GET    /chats/{id}/messages?cursor&limit
GET    /chats/{id}/messages/search?q=  → MessageDTO[]
GET    /chats/{id}/pinned              → MessageDTO[]
GET    /chats/{id}/starred             → MessageDTO[]  (del usuario autenticado)
GET    /messages/starred               → MessageDTO[]  (todos los chats)
POST   /messages                       → MessageDTO
PATCH  /messages/{id}                  → MessageDTO  (body: { content })
DELETE /messages/{id}?forEveryone
POST   /messages/{id}/read
POST   /messages/{id}/reactions        (body: { emoji })
DELETE /messages/{id}/reactions/{emoji}
POST   /messages/{id}/star
DELETE /messages/{id}/star
POST   /messages/{id}/pin
DELETE /messages/{id}/pin
POST   /messages/{id}/forward          (body: { chatIds: number[] })
GET    /users/search?q=
```

### Eventos WebSocket (todos en `/topic/chat.{chatId}` salvo indicación)
```
MESSAGE_NEW, MESSAGE_EDITED, MESSAGE_DELETED
REACTION_ADDED, REACTION_REMOVED
MESSAGE_PINNED   → { messageId, pinnedBy, at, isPinned }
TYPING_START/STOP → /topic/chat.{chatId}.typing
MESSAGE_READ      → /topic/chat.{chatId}.read
MESSAGE_DELIVERED → /user/queue/messages
USER_ONLINE/OFFLINE → /topic/presence
```

---

---

## Fase 4 — Detalle de implementación

### Tipos nuevos (`src/types/chat.ts`)
- `MessageDTO.isPinned?: boolean`, `MessageDTO.isStarred?: boolean`
- `MessagePinnedEvent` — `{ messageId, pinnedBy, at, isPinned }` — añadido a `ChatSocketEvent`

### chatStore (`src/store/chatStore.ts`)
Estado nuevo:
- `pinnedMessages: Record<chatId, Message[]>` — mensajes fijados por chat
- `starredMessages: Message[]` — todos los destacados del usuario

Acciones nuevas:
- `setPinnedMessages(chatId, messages)`, `setPinned(messageId, chatId, isPinned)` — actualiza pinned list y el flag `isPinned` en el mensaje
- `setStarredMessages(messages)`, `toggleStarred(messageId, isStarred)` — actualiza lista starred y flag `isStarred`

### API (`src/features/chat/api.ts`)
Métodos nuevos: `pinMessage`, `unpinMessage`, `forwardMessage`, `getPinnedMessages`, `getStarredMessages`, `searchMessages`

### useSocket (`src/hooks/useSocket.ts`)
- `useChatSubscription` maneja `MESSAGE_PINNED` → llama `setPinned(messageId, chatId, isPinned)`

### PinnedMessageBanner (`src/features/chat/components/PinnedMessageBanner.tsx`)
- Sticky bajo el header, muestra el mensaje fijado más reciente
- Si hay múltiples, muestra contador y botón para ciclar
- Click en contenido → scroll al mensaje; botón X → desfijar

### StarredMessagesView (`src/features/chat/components/StarredMessagesView.tsx`)
- Panel lateral derecho (w-80) con lista de mensajes destacados
- Se abre desde botón estrella en header; carga via `GET /api/messages/starred`
- Hover en item → botón quitar destacado

### ForwardDialog (`src/features/chat/components/ForwardDialog.tsx`)
- Modal con lista de chats + checkboxes + buscador
- Confirmar → `POST /api/messages/{id}/forward` con `chatIds[]`

### MessageBubble (`src/features/chat/components/MessageBubble.tsx`)
Props nuevas: `onPin`, `onStar`, `onForward`, `onScrollToReply`, `setRef`, `isHighlighted`
- Menú contextual: añade "Reenviar", "Destacar/Quitar destacado", "Fijar/Desfijar"
- Reply quote es clickeable → llama `onScrollToReply(replyTo.id)`
- `setRef` registra el elemento DOM en el mapa de refs del padre
- `isHighlighted` → ring amber-300 alrededor de la burbuja

### ChatWindow (`src/features/chat/components/ChatWindow.tsx`)
- `messageRefs: Map<number, HTMLDivElement>` para scroll programático
- `scrollToMessage(id)` → scrollIntoView + highlight 2s
- Barra de búsqueda toggle en header (reemplaza header): debounce 350ms → `searchMessages` → lista resultados con highlight del término
- Botón estrella en header → abre `StarredMessagesView`
- `PinnedMessageBanner` bajo el header cuando hay pinned messages
- Carga pinned al cambiar de chat activo via `useEffect`

---

## Instrucción para Claude

- No ejecutes comandos de build, compilación, tests ni servidores de desarrollo (`tsc`, `npm run build`, `npm run dev`, `npm test`, etc.) a menos que el usuario lo indique explícitamente.

Al acabar cada fase, actualiza obligatoriamente:
1. La tabla de estado de fases en este `CLAUDE.md`
2. La sección de detalle de la fase recién terminada
3. El `WORKBOARD.md` marcando todas las tareas completadas con `[x]`
