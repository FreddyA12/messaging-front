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
**Estado:** `[ ]`
- [ ] Dialog crear grupo (nombre, foto, seleccionar miembros)
- [ ] `GroupInfoPanel.tsx` — miembros, media compartida, enlace de invitación
- [ ] Gestión de miembros (añadir, eliminar, cambiar rol — solo admins)
- [ ] Autocomplete de @menciones en el input

---

## FASE 8 — Personalización

### 8.1
**Estado:** `[ ]`
- [ ] Toggle modo oscuro/claro (aplica clase `.dark` a `<html>`)
- [ ] Fondo por chat: selector de color/gradiente/imagen — guarda en chatStore y en backend
- [ ] `ThemeSettings.tsx`, `ChatWallpaper.tsx`, `PrivacySettings.tsx`
- [ ] Selector de tamaño de fuente (aplica clase a `<html>`: `font-small`, `font-large`)
- [ ] Color de burbujas propias personalizable (actualiza `--bubble-outgoing` en CSS)

---

## FASE 9 — Notificaciones y privacidad

### 9.1
**Estado:** `[ ]`
- [ ] Pedir permiso de Notification API al login
- [ ] Mostrar notificación cuando la pestaña no está activa + mensaje nuevo
- [ ] Silenciar chat por tiempo (UI en menú del chat)
- [ ] `PrivacySettings.tsx` — última vez, foto, ticks de lectura
