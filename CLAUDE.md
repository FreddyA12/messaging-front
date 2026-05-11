## Documentos de referencia obligatoria

Antes de tocar cualquier código, lee estos dos archivos:

| Archivo | Para qué sirve |
|---------|----------------|
| [PLANNING.md](PLANNING.md) | Arquitectura completa, stack, modelo de datos, endpoints REST y WS, restricciones, plan por fases |
| [WORKBOARD.md](WORKBOARD.md) | Estado actual de cada tarea — qué está hecho (`[x]`) y qué falta (`[ ]`) |

**Regla de oro:** si algo no está claro, PLANNING.md es la fuente de verdad del diseño. WORKBOARD.md es la fuente de verdad del estado de avance.

---

## Arrancar el proyecto

El frontend **requiere que el backend esté corriendo** en `http://localhost:8080`.

```bash
# 1. Arrancar el backend primero (en messaging-service/)
docker-compose up -d
# → levanta PostgreSQL + la app Spring Boot en http://localhost:8080

# 2. Instalar dependencias del frontend (solo la primera vez)
npm install

# 3. Arrancar el frontend
npm run dev
# → http://localhost:5173
```

Credenciales de prueba (creadas por Liquibase en el backend):

| Email | Contraseña |
|-------|------------|
| alice@chat.com | password |
| bob@chat.com | password |
| carol@chat.com | password |

---

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
| 5 — Multimedia | ✅ | `types/chat.ts`, `store/chatStore.ts`, `utils/imageCompression.ts`, `hooks/useAttachmentBlob.ts`, `features/media/api.ts`, `features/media/components/MediaGallery.tsx`, `MediaTab.tsx`, `DocumentsTab.tsx`, `LinksTab.tsx`, `AudiosTab.tsx`, `features/chat/components/ImageBubble.tsx`, `VideoBubble.tsx`, `AudioBubble.tsx`, `DocumentBubble.tsx`, `LinkPreviewCard.tsx`, `AttachMenu.tsx`, `AttachPreview.tsx`, `MessageBubble.tsx`, `ChatWindow.tsx` | Ver detalle abajo. |
| 6 — Llamadas WebRTC | ✅ | `types/call.ts`, `store/callStore.ts`, `features/calls/api.ts`, `features/calls/hooks/useWebRTC.ts`, `features/calls/components/CallManager.tsx`, `IncomingCallOverlay.tsx`, `CallScreen.tsx`, `routes/MainLayout.tsx`, `features/chat/components/ChatWindow.tsx` | Ver detalle abajo. |
| 7 — Grupos | ✅ | `features/chat/components/GroupInfoPanel.tsx`, `CreateGroupDialog.tsx`, `ChatWindow.tsx` | Panel de info de grupo, crear grupo, gestión de miembros, enlace de invitación. |
| 8 — Personalización | ✅ | `store/appearanceStore.ts`, `App.tsx` (ThemeProvider), `features/settings/SettingsPage.tsx`, `features/settings/api.ts`, `hooks/useTheme.ts` | Dark/light/system theme, paletas de color, font size, fondo de chat, sincroniza con backend. |
| 9 — Privacidad y notificaciones | ✅ | `hooks/useNotifications.ts`, `routes/MainLayout.tsx`, `features/settings/SettingsPage.tsx` | Browser Notification API, privacy settings (last-seen, profile-pic, read receipts). |
| 10 — Mensajes Temporales | ✅ | `types/chat.ts`, `features/chat/api.ts`, `store/chatStore.ts`, `features/chat/components/MessageBubble.tsx`, `TtlPickerDialog.tsx`, `ChatWindow.tsx` | expiresAt en mensajes, countdown timer, TTL picker dialog, cleanup job en backend, removeMessage en store. TTL selector en input. |
| 11 — Historias (Stories) | ✅ | `types/story.ts`, `store/storyStore.ts`, `features/stories/api.ts`, `features/stories/components/StoriesBar.tsx`, `StoryViewer.tsx`, `CreateStoryDialog.tsx`, `routes/MainLayout.tsx` | Feed agrupado por usuario, visor full-screen con progreso, texto o imagen/video, 24h TTL, cleanup cada hora en backend. |
| Fixes & mejoras post-11 | ✅ | `MainLayout.tsx`, `chatStore.ts`, `hooks/useSocket.ts`, `StoriesList.tsx`, `StoriesPanel.tsx`, `StoryPrivacyDialog.tsx`, `features/stories/api.ts`, `SettingsPage.tsx` | Ver detalle abajo. |
| 12 — Cifrado Afín | ✅ | `src/lib/afin.ts`, `src/store/encryptionStore.ts`, `LoginPage.tsx`, `RegisterPage.tsx`, `authStore.ts`, `ChatWindow.tsx`, `hooks/useSocket.ts`, `features/chat/api.ts` | Clave derivada con `deriveKey(userId)` — no aleatoria. Prefijo `AFN:` en ciphertext. `onRehydrateStorage` restaura clave tras recarga. Ver detalle abajo. |
| 13 — Mejoras UX multimedia | ✅ | `AudioRecorder.tsx`, `CameraCapture.tsx`, `ImageBubble.tsx`, `VideoBubble.tsx`, `AttachPreview.tsx`, `MessageBubble.tsx`, `ChatWindow.tsx`, `chatStore.ts`, `types/chat.ts`, `features/chat/api.ts` | Ver detalle abajo. |

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

## Fase 5 — Detalle de implementación

### Nuevos tipos (`src/types/chat.ts`)
- `AttachmentDTO` — `{ id, type, filename, mimeType, sizeBytes, thumbnailId? }`
- `LinkPreviewDTO` — `{ url, title, description, imageUrl, siteName }`
- `GalleryItemDTO` — attachment con `messageId`, `sentAt`, `senderName` (para galería)
- `LinkItemDTO` — link con `messageId`, `sentAt`
- `MessageDTO.attachments?: AttachmentDTO[]`, `MessageDTO.linkPreviews?: LinkPreviewDTO[]`

### Utilidades nuevas
- `src/utils/imageCompression.ts` — comprime imagen a JPEG vía canvas (max 1920px, quality 0.8)
- `src/hooks/useAttachmentBlob.ts` — fetcha un attachment con axios (JWT), crea object URL con caché en-memoria para no re-descargar

### Media API (`src/features/media/api.ts`)
- `uploadFile(file, onProgress?)` — POST multipart a `/api/media/upload`, devuelve `UploadResponse { attachmentId, ... }`
- `getGallery(chatId, type)`, `getDocuments`, `getLinks`, `getAudios`

### Componentes de burbuja (`src/features/chat/components/`)
- `ImageBubble` — muestra thumbnail vía `useAttachmentBlob`; click abre lightbox con imagen completa
- `VideoBubble` — carga el video vía blob URL con elemento `<video controls>`
- `AudioBubble` — wavesurfer.js v7; play/pause + waveform + timer; `ws.loadBlob` vía hook
- `DocumentBubble` — ícono por extensión, filename, tamaño; click descarga el archivo
- `LinkPreviewCard` — OG card con imagen externa, título, descripción, hostname

### Galería (`src/features/media/components/`)
- `MediaGallery` — panel lateral w-80 con 4 tabs: Medios / Docs / Links / Audio
- `MediaTab` — grid 3 columnas con thumbnails lazy, badge play en videos
- `DocumentsTab` — lista con ícono, nombre, tamaño, botón descargar
- `LinksTab` — lista con imagen OG, título, botón abrir
- `AudiosTab` — usa `AudioBubble` por cada audio + botón "ir al mensaje"

### Adjuntar en ChatWindow (`src/features/chat/components/ChatWindow.tsx`)
- Botón paperclip abre `AttachMenu` (posición absoluta con cierre al clic fuera)
- `AttachMenu` — 4 opciones (Imagen, Video, Audio, Documento); abre `<input type="file">` por tipo
- Al seleccionar imagen → `compressImage` → object URL para preview
- `AttachPreview` — muestra preview + barra de progreso durante upload
- `sendMessage` sube el archivo primero (`mediaApi.uploadFile`), luego envía mensaje con `attachmentIds`
- Botón enviar habilitado también cuando hay `pendingAttach` aunque el input esté vacío (permite enviar sin caption)
- Botón galería (grid icon) en header → abre `MediaGallery` como panel lateral derecho

---

## Fase 6 — Detalle de implementación

### Nuevos tipos (`src/types/call.ts`)
- `CallType` — `'VOICE' | 'VIDEO'`
- `CallStatus` — `'RINGING' | 'ONGOING' | 'ENDED' | 'MISSED' | 'REJECTED'`
- `CallEndReason` — `'HANGUP' | 'REJECTED' | 'MISSED' | 'ERROR' | 'BUSY'`
- `CallDTO` — entrada de historial de llamadas
- `CallSignalingEvent` — unión discriminada de eventos WS de señalización:
  - `CALL_OFFER` — `{ callId, from, fromName, callType, sdp }`
  - `CALL_ANSWER` — `{ callId, from, sdp }`
  - `CALL_ICE_CANDIDATE` — `{ callId, from, candidate }`
  - `CALL_ENDED` — `{ callId, reason }`
  - `CALL_ESCALATE` — `{ callId, from, enableVideo }`

### callStore (`src/store/callStore.ts`)
Estado:
- `call: ActiveCall | null` — llamada actual con `phase`, `type`, `isCaller`, `peerId/Name`, `startedAt`, `muted`, `cameraOff`
- `pendingStart: PendingOutgoingCall | null` — solicitud para iniciar llamada (puente entre ChatWindow y CallManager)

Fases: `IDLE`, `RINGING_OUT`, `RINGING_IN`, `CONNECTING`, `ACTIVE`, `ENDED`

Acciones: `requestOutgoingCall`, `clearPendingStart`, `startOutgoing`, `startIncoming`, `setPhase`, `setActive`, `setType`, `setMuted`, `setCameraOff`, `endCall`

### useWebRTC (`src/features/calls/hooks/useWebRTC.ts`)
Encapsula todo el ciclo de vida WebRTC:
- `startCall(peerId, peerName, type, chatId?)` — POST `/api/calls/initiate` → getUserMedia → crear `RTCPeerConnection` con STUN de Google → addTracks → createOffer → setLocalDescription → publish `/app/call.offer`
- `acceptCall()` — POST `/api/calls/{id}/accept` → getUserMedia → crear PC → setRemoteDescription(offer) → createAnswer → setLocalDescription → publish `/app/call.answer`
- `onOffer/onAnswer/onIceCandidate/onRemoteEnd` — handlers llamados por `CallManager` al recibir señalización
- `rejectCall`, `endCall(notifyPeer)` — POST a REST + publish a `/app/call.end`
- `toggleMute` / `toggleCamera` — habilita/deshabilita tracks locales
- `switchCamera` — intercambia facingMode user/environment vía `replaceTrack`
- `escalateToVideo` — pide video con `getUserMedia`, lo añade al PC, reoferta y publica `/app/call.escalate`
- Buffer de ICE candidates: si llegan antes del remoteDescription, se almacenan y se drenan después
- Trickle ICE: cada `onicecandidate` se publica en `/app/call.ice` con `{ callId, to, candidate }`

### CallManager (`src/features/calls/components/CallManager.tsx`)
- Montado en `MainLayout` una sola vez; posee la única instancia de `useWebRTC`
- Suscribe `/user/queue/calls` y dispatcha a los handlers de useWebRTC según `event.type`
- Observa `pendingStart` del store para iniciar llamadas salientes (ChatWindow sólo dispara `requestOutgoingCall`)
- Renderiza `IncomingCallOverlay` cuando `phase === 'RINGING_IN'`, o `CallScreen` en cualquier otra fase activa

### IncomingCallOverlay (`src/features/calls/components/IncomingCallOverlay.tsx`)
- Overlay full-screen con avatar con pulse animado, nombre, tipo de llamada
- Dos botones: rechazar (rojo) / aceptar (verde); icono cambia según voz/video

### CallScreen (`src/features/calls/components/CallScreen.tsx`)
- Full-screen overlay; muestra video remoto o avatar (voz) + video local en PIP (esquina inferior derecha)
- Audio element dedicado para voz (srcObject = remoteStream) — en video el `<video>` ya lleva el audio
- Status dinámico: "Llamando…" / "Conectando…" / `MM:SS` transcurrido (se arranca al pasar a `ACTIVE`)
- Controles: Silenciar, Cámara on/off (video), Voltear cámara (video), Picture-in-Picture (`video.requestPictureInPicture()`), Escalar a video (voz), Colgar

### Integración en ChatWindow (`src/features/chat/components/ChatWindow.tsx`)
- Botones de llamada de voz y video en el header (solo chats privados sin llamada en curso)
- Click → `useCallStore.requestOutgoingCall({ peerId, peerName, type, chatId })`

### Endpoints / eventos usados
REST:
- `POST /api/calls/initiate` → `{ callId }`
- `POST /api/calls/{id}/accept`
- `POST /api/calls/{id}/reject`
- `POST /api/calls/{id}/end`
- `GET  /api/calls/history`

WS cliente → servidor:
- `/app/call.offer` `{ callId, to, callType, sdp }`
- `/app/call.answer` `{ callId, to, sdp }`
- `/app/call.ice` `{ callId, to, candidate }`
- `/app/call.end` `{ callId, to }`
- `/app/call.escalate` `{ callId, to, enableVideo }`

WS servidor → cliente (en `/user/queue/calls`):
- `CALL_OFFER`, `CALL_ANSWER`, `CALL_ICE_CANDIDATE`, `CALL_ENDED`, `CALL_ESCALATE`

### Pendiente de backend para fase 6
- Implementar `CallSignalingController` que reenvía offer/answer/ice/end entre peers por `/user/queue/calls`
- `CallController` con los endpoints REST anteriores
- Persistir llamada y emitir mensaje de sistema en el chat para llamadas perdidas
- `ChatDTO.otherUserId` (ya documentado en fase 3) — necesario para habilitar los botones de llamada

---

## Fase 7 — Detalle de implementación

### Componentes nuevos
- `GroupInfoPanel.tsx` — panel lateral derecho con miembros, roles, enlace de invitación, añadir/eliminar miembros (solo admins)
- `CreateGroupDialog.tsx` — modal para crear grupo: nombre, descripción, seleccionar miembros de la lista de contactos

### Integración en ChatWindow
- Botón "personas" en header (solo para chats GROUP) → toggle `showGroupInfo`
- Panel mutuamente excluyente con `StarredMessagesView` y `MediaGallery`
- `GroupInfoPanel` recibe `chatId`, `chatName`, `description`, `onClose`

### API (`src/features/chat/api.ts`)
- `createGroup(data)`, `getGroupMembers(chatId)`, `addGroupMembers(chatId, userIds)`, `removeGroupMember(chatId, userId)`, `changeGroupMemberRole(chatId, userId, role)`, `generateInviteLink(chatId)`, `joinByCode(code)`, `leaveGroup(chatId)`

---

## Fase 8 — Detalle de implementación

### appearanceStore (`src/store/appearanceStore.ts`)
- `FontSize = 'small' | 'normal' | 'large'`
- `fontSize: FontSize` (default `'normal'`), `setFontSize`
- `theme: 'light' | 'dark' | 'system'`, palettes, chatBackground

### ThemeProvider (`src/App.tsx`)
- Componente wrapping `AppRoutes`; aplica dark/light/system via media query listener
- Aplica CSS vars `--color-primary`, `--color-primary-dark`, `--color-primary-light`, `--bubble-outgoing`
- Aplica `font-small`/`font-large` a `<html>`

### SettingsPage (`src/features/settings/SettingsPage.tsx`)
- `ProfileSection`: editar nombre, estado, avatar (POST /api/users/me/avatar)
- `ChatsSection`: selector tema, paleta de color, fondo de chat, font size — sincroniza via `settingsApi.updatePreferences`
- `AccountSection`: privacidad last-seen/foto (EVERYONE/CONTACTS/NOBODY), read receipts — `settingsApi.updatePrivacy`

### settingsApi / userApi (`src/features/settings/api.ts`)
- `settingsApi.getPreferences()`, `updatePreferences(data)`, `updatePrivacy(data)`
- `userApi.updateProfile(data)`, `uploadAvatar(file)`

---

## Fase 9 — Detalle de implementación

### useNotifications (`src/hooks/useNotifications.ts`)
- Solicita permiso `Notification` al montar
- Observa `messages` del chatStore; cuando tab no está en foco y llega mensaje nuevo de otro usuario en un chat no activo → muestra `new Notification(...)` con `tag: 'msg-${id}'`

### Integración
- `useNotifications()` llamado en `MainLayout.tsx`

---

## Fase 10 — Detalle de implementación

### Tipos
- `MessageDTO.expiresAt?: string | null` en `src/types/chat.ts`
- `SendMessageRequest.ttlSeconds?: number` en `src/types/chat.ts`
- `Message.expiresAt: string | null` en `src/store/chatStore.ts`

### chatStore
- `removeMessage(messageId)` — filtra el mensaje de todos los chats (para cuando expira localmente)

### MessageBubble (`src/features/chat/components/MessageBubble.tsx`)
- `useCountdown(expiresAt, onExpired)` hook con `useRef` para evitar stale closure
- Muestra contador regresivo en área de timestamp (icono reloj naranja + tiempo formateado)
- `formatCountdown(secs)` — `MM:SS` o `Xd`, `Xh`, `Xm`
- Menú contextual: "⏱ Autodestrucción" / "⏱ Cambiar autodestrucción" solo en mensajes propios → llama `onSetTtl`
- Props: `onSetTtl?: (message: Message) => void`

### TtlPickerDialog (`src/features/chat/components/TtlPickerDialog.tsx`)
- Modal con presets: 30s, 5min, 1h, 24h, 7d + input personalizado en segundos
- "Cancelar autodestrucción" si `message.expiresAt` existe → `onConfirm(id, 0)`

### ChatWindow (`src/features/chat/components/ChatWindow.tsx`)
- `ttlMessage` state, `handleSetTtl(messageId, ttlSeconds)` → `chatApi.setMessageTtl`
- Pasa `onSetTtl={setTtlMessage}` a `MessageBubble`
- Renderiza `<TtlPickerDialog>` condicionalmente

### Backend (messaging-service)
- Migración 016: `expires_at TIMESTAMP` nullable en `messages` + índice
- `ExpiredMessageCleanupJob` con `@Scheduled(fixedDelay=60_000)` — marca expirados como `deletedForEveryone`, emite `MESSAGE_DELETED` por WS
- `PATCH /api/messages/{id}/ttl?ttlSeconds=X` — solo el autor

---

## Fase 11 — Detalle de implementación (Historias)

### Tipos (`src/types/story.ts`)
- `StoryDTO` — id, userId, userName, hasMedia, mimeType, hasThumbnail, textContent, backgroundColor, createdAt, expiresAt, viewedByMe, viewCount
- `StoryUserGroupDTO` — userId, userName, hasUnviewed, stories[]

### storyStore (`src/store/storyStore.ts`)
- `feedGroups: StoryUserGroupDTO[]`, `myStories: StoryDTO[]`
- Acciones: `setFeedGroups`, `setMyStories`, `addMyStory`, `removeMyStory`, `markViewed`

### API (`src/features/stories/api.ts`)
- `getFeed()` → GET /api/stories/feed → StoryUserGroupDTO[]
- `getMyStories()` → GET /api/stories/my → StoryDTO[]
- `createStory(form)` → POST /api/stories (multipart) → StoryDTO
- `deleteStory(id)`, `viewStory(id)`, `mediaUrl(id)`, `thumbnailUrl(id)`

### StoriesBar (`src/features/stories/components/StoriesBar.tsx`)
- Barra horizontal sobre la lista de chats (en MainLayout.tsx)
- Primer ítem: "Mi historia" — abre CreateStoryDialog si no hay historias propias, o las muestra
- Historias no vistas: anillo verde degradado; vistas: anillo gris
- Solo se renderiza si hay grupos o historias propias

### StoryViewer (`src/features/stories/components/StoryViewer.tsx`)
- Overlay full-screen negro
- Barra de progreso por historia en la parte superior (auto-avance 5 segundos)
- Zonas de tap (1/3 izquierda = anterior, 1/3 derecha = siguiente)
- Teclado: Escape cierra, Flechas navegan
- Al ver historia → `storiesApi.viewStory(id)` + `markViewed(id)` en store
- Descarga media con fetch + Authorization header → blob URL

### CreateStoryDialog (`src/features/stories/components/CreateStoryDialog.tsx`)
- Dos tabs: Texto e Imagen/Video
- Texto: textarea + selector de 8 colores de fondo + preview en tiempo real
- Imagen/Video: file picker con preview, soporta image/* y video/*
- Botón "Publicar" → POST /api/stories (multipart)

### TTL selector en input (ChatWindow)
- Botón reloj junto al textarea
- Popover con opciones: sin autodestrucción, 30s, 5min, 1h, 24h, 7d
- Punto naranja en el botón cuando hay TTL activo
- Se pasa como `ttlSeconds` en el payload STOMP al enviar

---

## Credenciales de Prueba

Para testing y desarrollo, están disponibles los siguientes usuarios:

| Email | Contraseña |
|-------|------------|
| alice@chat.com | password |
| bob@chat.com | password |
| carol@chat.com | password |

**Nota**: Estos usuarios se crean automáticamente mediante Liquibase en modo desarrollo (contexto "dev"). Ver `messaging-service/src/main/resources/db/changelog/db.changelog-master.xml` changeset `seed-dev-users`.

---

## Fixes & mejoras post-fase 11 — Detalle

### Bugs corregidos
- **Auto-notificación al enviar**: `setActiveChat` ahora hace `unreadCount = 0` para ese chat al abrirlo
- **Mensajes en tiempo real de chats no activos**: hook `useAllChatsNotifications(chatIds)` en `useSocket.ts` — suscribe a todos los topics `/topic/chat.{id}` simultáneamente; en `MESSAGE_NEW` incrementa `unreadCount` si `senderId !== yo` y `chatId !== activeChatId`
- **Infinite loop**: `chatIds` en `MainLayout` memoizado con `useMemo` para que el selector de Zustand no cree array nuevo en cada render
- **Blob URL historias**: `StoryViewer` y `StoriesPanel` usan `api.get(..., {responseType:'blob'})` (axios con baseURL y JWT) en lugar de `fetch` nativo

### chatStore — acciones nuevas
- `incrementUnread(chatId)` — suma 1 al badge de no leídos
- `clearUnread(chatId)` — limpia badge
- `setActiveChat` actualizado para llamar `clearUnread` automáticamente

### Historias en sección propia (como WhatsApp Web)
- `MainLayout.tsx`: pestaña **Chats** / **Historias**; estado `section` + `activeStory`
- `StoriesList.tsx` (nuevo): lista vertical en el sidebar — "Mi historia" con `+`, anillo verde/gris, tiempo relativo, botón de privacidad
- `StoriesPanel.tsx` (nuevo): visor en el panel principal (no overlay) — proporción 9:16 centrada en fondo negro, barras de progreso animadas, zonas de tap, flechas entre grupos, contador de vistas

### Privacidad de historias
- `StoryPrivacyDialog.tsx` (nuevo): modal con lista de contactos + toggle para ocultar historia a cada uno
- `features/stories/api.ts`: `getPrivacy()` y `updatePrivacy(hiddenFromUserIds)`
- Backend: tabla `story_privacy`, `StoryPrivacy.java`, `StoryPrivacyRepository`, `GET/PUT /api/stories/privacy`, feed filtra automáticamente (migración 019)

### Avatar en Settings
- `SettingsPage.tsx`: preview inmediato con `URL.createObjectURL` tras seleccionar foto; mensaje "Foto actualizada" / "Error al subir la foto"

---

## Fase 12 — Detalle de implementación (Cifrado Afín)

### Algoritmo
- `E(x) = (a·x + b) & 0xFF` byte a byte; resultado codificado como Base64
- `D(y) = (a⁻¹·(y − b + 256)) & 0xFF` byte a byte; entrada desde Base64
- `a` debe ser impar y ≥ 3 (todos impares son coprimos con 256 = 2^8)
- `b` ∈ [0, 255]
- `modInverse` implementado con Euclides extendido

### Módulo afín (`src/lib/afin.ts`)
- `modInverse(a, m)`, `isValidKey(a)`, `encryptByte`, `decryptByte`, `encrypt`, `decrypt`, `safeDecrypt`
- `safeDecrypt` = `decrypt` envuelto en try/catch — devuelve el original si falla (compatibilidad con mensajes pre-cifrado)

### Gestión de clave (`src/store/encryptionStore.ts`)
- Zustand sin `persist` — la clave vive solo en memoria de la sesión del navegador
- `setKey(a, b)` valida con `isValidKey` antes de guardar
- `clearKey()` llamado desde `authStore.clearAuth` vía dynamic import para evitar dependencias circulares

### Flujo de clave
- Login / registro exitoso → `LoginPage.tsx` / `RegisterPage.tsx` generan `a` aleatorio impar [3,255] y `b` [0,255] → `useEncryptionStore.getState().setKey(a, b)`
- Logout → `authStore.clearAuth` llama `useEncryptionStore.getState().clearKey()`

### Puntos de cifrado
- **Envío**: `ChatWindow.tsx` `sendMessage()` — cifra `content` antes de `publish('/app/chat.send', ...)` y antes de `chatApi.editMessage`
- **Recepción WS**: `useSocket.ts` función `toMessage()` — descifra `content` antes de insertar al store (cubre `useChatSubscription` y `useAllChatsNotifications`)
- **Historial**: `chatApi.getMessages` — map con `decryptMessage` sobre la respuesta REST
- Solo el campo `content` se cifra; `type`, `attachments`, `reactions`, etc. no se tocan

### Tests (`src/lib/afin.test.ts`)
- Round-trip ASCII, multibyte, emojis, edge cases (vacío, un char, cadena larga)
- Todos los impares [3,255] pasan round-trip
- `safeDecrypt` devuelve original para texto plano no cifrado
- Mutation test: byte adulterado → output diferente al original

---

## Fase 13 — Detalle de implementación (Mejoras UX multimedia)

### Ver una vez
- `MessageDTO` y `SendMessageRequest` en `src/types/chat.ts`: nuevos campos `viewOnce?: boolean`, `viewedByMe?: boolean`
- `Message` en `src/store/chatStore.ts`: `viewOnce: boolean`, `viewedByMe: boolean`; acción `markViewedOnce(messageId)` → setea `viewedByMe: true` en el store
- `chatApi.markViewedOnce(id)` → `POST /api/messages/{id}/view-once` (silenciado con `.catch(() => {})`)
- `ImageBubble` / `VideoBubble`: tres estados para receptor — "tap to view" cover, imagen/video normal revelado, placeholder "Foto/Video vista". En mensajes propios muestra badge ojo con "1"
- `AttachPreview`: botón ojo toggleable (solo IMAGE/VIDEO); activa flag `viewOnce` antes de enviar
- `ChatWindow`: estado `viewOnce`, toggle en preview; se incluye en el payload STOMP como `viewOnce: true`

### Grabación de audio
- `AudioRecorder.tsx`: dos fases — `recording` (timer + barra animada roja, botón stop) y `preview` (`<audio controls>` + botón cancelar/enviar)
- Usa `MediaRecorder` con `audio/webm;codecs=opus` (fallback `audio/webm`)
- Al enviar: crea `File` → pasa a `handleFileSelected(file, 'AUDIO')` → flujo normal de upload
- Botón micrófono en la barra inferior visible cuando no hay texto ni adjunto; al pulsar reemplaza la barra entera con `AudioRecorder`

### Cámara integrada
- `CameraCapture.tsx`: modal full-screen negro
- Filtros CSS aplicados en tiempo real sobre el `<video>`: Normal, B&N, Sepia, Vívido, Cálido, Frío
- Foto: `canvas.toBlob(jpeg, 0.92)` con `ctx.filter` aplicado → File
- Video: `MediaRecorder` sobre el `getUserMedia` stream (con audio); botón detener → fase preview
- Botón flip cámara alterna entre `user` / `environment`
- Fases: `preview` → `photo-taken` / `recording` → `video-taken`; retomar reinicia la cámara

### Reorganización de la barra inferior
- Layout: `[📎] [📷] [textarea] [⏱] [🎤/✉️]`
- El botón derecho es dinámico: micrófono si no hay `input.trim() && !pendingAttach && !editingMessage`; botón enviar en caso contrario
- El menú TTL se posiciona `bottom-12 right-0` (antes `left-0`)
- `CameraCapture` se renderiza como modal `position:fixed` independiente del layout del chat

## Instrucción para Claude

- No ejecutes comandos de build, compilación, tests ni servidores de desarrollo (`tsc`, `npm run build`, `npm run dev`, `npm test`, etc.) a menos que el usuario lo indique explícitamente.
- No escribas ni crees archivos de tests bajo ninguna circunstancia a menos que el usuario lo pida explícitamente.

Al acabar cada fase, actualiza obligatoriamente:
1. La tabla de estado de fases en este `CLAUDE.md`
2. La sección de detalle de la fase recién terminada
3. El `WORKBOARD.md` marcando todas las tareas completadas con `[x]`
