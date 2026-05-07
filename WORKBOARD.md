# Workboard — messaging-front (Frontend)

> Tablero de tareas para el frontend. Lee también `messaging-service/WORKBOARD.md` para las tareas del backend.
> Stack: React 18 · TypeScript · Vite · Tailwind CSS · Zustand · React Query · STOMP

## Convenciones obligatorias
- TypeScript strict habilitado
- Tailwind para todos los estilos (sin CSS modules ni styled-components)
- Zustand para estado global (`src/store/`)
- React Query para cache de datos REST
- Zod + react-hook-form para todos los formularios
- No usar `any` en TypeScript
- Commits semánticos: `feat:`, `fix:`, `chore:`, `refactor:`

## Arrancar el proyecto
```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno
cp .env.example .env

# 3. Arrancar
npm run dev
# → http://localhost:5173
```

## Estructura de src/
```
src/
├── main.tsx                      ✅ HECHO
├── App.tsx                       ✅ HECHO
├── index.css                     ✅ HECHO (Tailwind + variables CSS)
├── lib/
│   ├── axios.ts                  ✅ HECHO (interceptor JWT + refresh)
│   ├── socket.ts                 ✅ HECHO (STOMP client)
│   └── queryClient.ts            ✅ HECHO
├── store/
│   ├── authStore.ts              ✅ HECHO (Zustand + persist)
│   └── chatStore.ts              ✅ HECHO (estructura base)
├── types/
│   ├── auth.ts                   ✅ HECHO
│   └── chat.ts                   ✅ HECHO
├── hooks/
│   ├── useAuth.ts                ✅ HECHO
│   └── useSocket.ts              ✅ HECHO (conectar/desconectar)
├── routes/
│   ├── AppRoutes.tsx             ✅ HECHO
│   ├── AuthGuard.tsx             ✅ HECHO
│   └── MainLayout.tsx            ✅ HECHO (placeholder sidebar + área principal)
├── features/
│   ├── auth/
│   │   ├── api.ts                ✅ HECHO
│   │   ├── LoginPage.tsx         ✅ HECHO
│   │   └── RegisterPage.tsx      ✅ HECHO (con indicador de fortaleza)
│   ├── chat/
│   │   ├── api.ts                ✅ HECHO (funciones base)
│   │   └── components/           🔲 PENDIENTE (Fase 2)
│   ├── calls/
│   │   └── hooks/useWebRTC.ts    ✅ HECHO (placeholder Fase 6)
│   ├── media/                    🔲 PENDIENTE (Fase 5)
│   ├── groups/                   🔲 PENDIENTE (Fase 7)
│   ├── contacts/                 🔲 PENDIENTE (Fase 9)
│   └── settings/                 🔲 PENDIENTE (Fase 8)
└── components/                   🔲 PENDIENTE (componentes UI compartidos)
```

---

## FASE 2 — ChatList + ChatWindow + STOMP

### 2.1 — ChatList component
**Estado:** `[x]`

- [x] `src/features/chat/components/ChatList.tsx`:
  - Lista de `ChatListItem` con avatar, nombre, último mensaje, hora, badge unread
  - Skeleton loading mientras carga
  - Barra de búsqueda para filtrar chats localmente
  - Botón "+" para iniciar nuevo chat (abre modal de búsqueda de usuario)
  - Al hacer click → `setActiveChat(chatId)`

- [x] `src/features/chat/components/NewChatModal.tsx`:
  - Input de búsqueda de usuario (llama a `GET /api/users/search?q=`)
  - Lista de resultados con avatar + nombre
  - Al seleccionar → `createPrivateChat(userId)` → abre el chat

### 2.2 — ChatWindow + MessageBubble
**Estado:** `[x]`
**Depende de:** 2.1

- [x] `src/features/chat/components/ChatWindow.tsx`:
  - Header: avatar, nombre, estado online/offline
  - Área de mensajes con `overflow-y-auto` + `flex-col-reverse` para anclar al fondo
  - Scroll infinito hacia arriba (IntersectionObserver) → `prependMessages`
  - Input de texto con botón enviar (Enter también envía)
  - Subscripción STOMP a `/topic/chat.{chatId}` al montar

- [x] `src/features/chat/components/MessageBubble.tsx`:
  - Burbuja propia (derecha, color `bubble-outgoing`) vs ajena (izquierda, `bubble-incoming`)
  - Hora formateada
  - Ticks placeholder (se completan en Fase 3)
  - Nombre del remitente en grupos

- [x] Actualizar `MainLayout.tsx` para renderizar `ChatList` y `ChatWindow`

### 2.3 — Integración STOMP en chat
**Estado:** `[x]`

- [x] `src/hooks/useSocket.ts` — completar para que acepte suscripciones por chat
- [x] Al recibir `MESSAGE_NEW` → `addMessage(message)` en chatStore
- [x] Enviar mensaje via `publish('/app/chat.send', {...})`

---

## FASE 3 — UI de mensajería avanzada

### 3.1 — Ticks y presencia
**Estado:** `[x]`
- [x] Ticks en `MessageBubble`: ✓ (enviado) · ✓✓ gris (entregado) · ✓✓ azul (leído)
- [x] Subscripción a `/topic/presence` → actualizar `isOnline` en chatStore
- [x] Header del chat muestra "en línea" o "visto hace X"

### 3.2 — Reply, Edit, Delete
**Estado:** `[x]`
- [x] Click en mensaje → menú contextual (responder, editar, eliminar, destacar, reenviar)
- [x] `ReplyPreview.tsx` — banner sobre el input al responder
- [x] La burbuja muestra el mensaje citado con clic para scroll
- [x] Modo edición: el input se llena con el contenido actual
- [x] Dialog de eliminar: "Para mí" / "Para todos"

### 3.3 — Reacciones y typing
**Estado:** `[x]`
- [x] Long-press/hover en burbuja → emoji picker (emoji-picker-react)
- [x] Reacciones debajo de la burbuja agrupadas por emoji
- [x] "Juan está escribiendo..." al recibir TYPING_START
- [x] Enviar TYPING_START al escribir (debounced) y TYPING_STOP al parar

---

## FASE 4 — Pin, Star, Forward, Search

### 4.1
**Estado:** `[x]`
- [x] `PinnedMessageBanner.tsx` — sticky arriba del chat, click para hacer scroll
- [x] `StarredMessagesView.tsx` — drawer lateral o panel
- [x] `ForwardDialog.tsx` — selector de chats con checkbox
- [x] Barra de búsqueda en chat (GET search), highlight en resultados
- [x] Scroll al mensaje citado con animación de highlight

---

## FASE 5 — Multimedia

### 5.1
**Estado:** `[x]`
- [x] Botón adjuntar → menú con opciones (imagen, video, doc, audio)
- [x] Compresión de imagen client-side con canvas antes de subir
- [x] Preview de imagen/video en burbuja (blob URL)
- [x] `MediaGallery.tsx`, `DocumentsTab.tsx`, `LinksTab.tsx`, `AudiosTab.tsx`
- [x] Reproductor de audio con waveform (wavesurfer.js)
- [x] Link preview card con título + descripción + imagen OG

---

## FASE 6 — Llamadas WebRTC

### 6.1
**Estado:** `[x]`
- [x] Completar `useWebRTC.ts` (RTCPeerConnection, getUserMedia, ICE)
- [x] Pantalla de llamada entrante (overlay con aceptar/rechazar)
- [x] Pantalla de llamada activa (mute, cámara, PIP, colgar)
- [x] Escalado de voz a video en vivo

---

## FASE 7 — Grupos

### 7.1
**Estado:** `[x]`
- [x] Dialog crear grupo (nombre, foto, seleccionar miembros)
- [x] `GroupInfoPanel.tsx` — miembros, media compartida, enlace de invitación
- [x] Gestión de miembros (añadir, eliminar, cambiar rol — solo admins)
- [x] Autocomplete de @menciones en el input

---

## FASE 8 — Personalización

### 8.1
**Estado:** `[x]`
- [x] Toggle modo oscuro/claro (aplica clase `.dark` a `<html>`)
- [x] Fondo por chat: selector de color/gradiente/imagen — guarda en chatStore y en backend
- [x] `ThemeSettings.tsx`, `ChatWallpaper.tsx`, `PrivacySettings.tsx`
- [x] Selector de tamaño de fuente (aplica clase a `<html>`: `font-small`, `font-large`)
- [x] Color de burbujas propias personalizable (actualiza `--bubble-outgoing` en CSS)

---

## FASE 9 — Notificaciones y privacidad

### 9.1
**Estado:** `[x]`
- [x] Pedir permiso de Notification API al login
- [x] Mostrar notificación cuando la pestaña no está activa + mensaje nuevo
- [x] Silenciar chat por tiempo (UI en menú del chat)
- [x] `PrivacySettings.tsx` — última vez, foto, ticks de lectura

---

## FASE 10 — Mensajes Temporales

### 10.1
**Estado:** `[x]`
- [x] `src/types/chat.ts`: añadir `expiresAt?: string` a `MessageDTO`; añadir `ttlSeconds?: number` a `SendMessageRequest`
- [x] `src/features/chat/api.ts`: `setMessageTtl(messageId, ttlSeconds)` → `PATCH /api/messages/{id}/ttl`
- [x] `MessageBubble.tsx`:
  - Mostrar contador regresivo visible si `expiresAt` está presente (`useEffect` con `setInterval` de 1s)
  - Icono de reloj junto a la hora de envío
  - Al llegar a 0 → eliminar la burbuja del store localmente (no esperar evento WS)
- [x] Menú contextual en `MessageBubble` (solo mensajes propios): opción "Activar autodestrucción" → abre selector de tiempo (30 s, 5 min, 1 h, 24 h, 7 d, personalizado)
- [x] `TtlPickerDialog.tsx` — modal con opciones de tiempo + input personalizado en segundos
- [x] Al enviar mensaje nuevo: añadir selector de TTL opcional en el área de input (icono reloj junto al botón enviar)
- [x] `chatStore.ts`: `removeMessage(messageId)` — elimina el mensaje del estado local cuando llega la hora

---

## FASE 11 — Historias (Stories)

### 11.1
**Estado:** `[x]`
- [x] `src/types/story.ts`: `StoryDTO`, `StoryUserGroupDTO`
- [x] `src/store/storyStore.ts`: `feedGroups`, `myStories`, acciones
- [x] `src/features/stories/api.ts`: `getFeed`, `getMyStories`, `createStory`, `deleteStory`, `viewStory`, `mediaUrl`, `thumbnailUrl`
- [x] `src/features/stories/components/StoriesBar.tsx` — barra horizontal sobre el chat list con avatares anillados
- [x] `src/features/stories/components/StoryViewer.tsx` — visor full-screen con barra de progreso, navegación, auto-avance 5 s
- [x] `src/features/stories/components/CreateStoryDialog.tsx` — crear historia de texto (colores de fondo) o imagen/video
- [x] Integración en `MainLayout.tsx` — `<StoriesBar />` sobre `<ChatList />`

---

## FIXES Y MEJORAS (post-fase 11)

- [x] **Bug auto-notificación**: `setActiveChat` limpia `unreadCount` del chat al abrirlo
- [x] **Tiempo real mensajes no activos**: hook `useAllChatsNotifications` — suscribe a todos los chats simultáneamente; incrementa `unreadCount` en tiempo real cuando llega mensaje de otro en chat no activo (`store/chatStore.ts`: `incrementUnread`, `clearUnread`)
- [x] **Avatar feedback**: `SettingsPage.tsx` muestra preview inmediato al subir foto y mensaje de éxito/error
- [x] **Historias en sección propia**: pestaña "Chats" / "Historias" en el sidebar de `MainLayout.tsx`; historias ya no están mezcladas con la lista de chats
- [x] **Visor en panel principal**: `StoriesPanel.tsx` — historia en panel principal con barra de progreso animada, proporción 9:16, navegación por tap/teclado; no es overlay
- [x] **StoriesList**: `StoriesList.tsx` — lista vertical de historias en el sidebar (Mi historia + Recientes, anillos, tiempo relativo)
- [x] **Ocultar historias**: `StoryPrivacyDialog.tsx` — seleccionar contactos para ocultar tu historia; guarda en backend `PUT /api/stories/privacy`; feed del visor filtra automáticamente
- [x] **Fix blob media historias**: `StoryViewer` y `StoriesPanel` usan `api.get(..., {responseType:'blob'})` en lugar de `fetch` nativo (corrige URL y JWT)
- [x] **Fix infinite loop**: `chatIds` memoizado con `useMemo` en `MainLayout.tsx` para evitar re-renders infinitos al usar Zustand selector con `.map()`

---

## FASE 12 — Cifrado Afín manual (sin librerías)

> El frontend cifra el plaintext con Afín antes de enviarlo. El backend recibe `C1` opaco. Al recibir mensajes, el cliente receptor descifra Afín⁻¹. Ver `ENCRYPTION.md` en la raíz del repo padre.

### 12.1 — Módulo afin.ts
**Estado:** `[x]`

- [x] `src/lib/afin.ts`:
  - `modInverse(a: number, m: number): number` — Euclides extendido; lanza si no existe inverso
  - `isValidKey(a: number): boolean` — `a` impar y `gcd(a, 256) === 1`
  - `encryptByte(x: number, a: number, b: number): number` — `(a*x + b) & 0xFF`
  - `decryptByte(y: number, aInv: number, b: number): number` — `(aInv*(y - b + 256)) & 0xFF`
  - `encrypt(plaintext: string, a: number, b: number): string` — codifica cada byte, retorna Base64
  - `decrypt(ciphertext: string, a: number, b: number): string` — decodifica Base64, aplica decrypt byte a byte
  - `safeDecrypt` — wrapper con try/catch para compatibilidad con mensajes pre-cifrado
- [x] Tests unitarios: `encrypt(decrypt(x)) === x` para ASCII, emojis y caracteres multibyte + mutation tests (`src/lib/afin.test.ts`)

### 12.2 — Gestión de clave de sesión
**Estado:** `[x]`
**Depende de:** 12.1

- [x] `src/store/encryptionStore.ts` (Zustand, sin persist):
  - `a: number`, `b: number` — valores de la clave Afín
  - `setKey(a, b)` — valida con `isValidKey` antes de guardar
  - `clearKey()` — limpia al hacer logout
- [x] Al hacer login exitoso: generar `a` y `b` aleatorios válidos y guardar en el store (`LoginPage.tsx`, `RegisterPage.tsx`)
- [x] Al hacer logout: llamar `clearKey()` desde `authStore.clearAuth`

### 12.3 — Integración en envío y recepción de mensajes
**Estado:** `[x]`
**Depende de:** 12.1, 12.2

- [x] `src/features/chat/components/ChatWindow.tsx` — cifrar `content` antes del `publish('/app/chat.send')` y antes de `chatApi.editMessage`
- [x] `src/hooks/useSocket.ts` — descifrar `content` en `toMessage()` (cubre `MESSAGE_NEW` en `useChatSubscription` y `useAllChatsNotifications`)
- [x] `src/features/chat/api.ts` — descifrar cada `content` en `getMessages`
- [x] Solo `content` pasa por cifrado — type, attachments, reactions y demás campos no se tocan
