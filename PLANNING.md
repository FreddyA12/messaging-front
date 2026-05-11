# Planning — App de mensajería tipo WhatsApp

> Documento de planificación técnica para el desarrollo de una aplicación de mensajería con las funcionalidades principales de WhatsApp. Stack: Spring Boot (monolito) + React + PostgreSQL, todo local.

---

## Tabla de contenidos

1. [Resumen del proyecto](#1-resumen-del-proyecto)
2. [Stack tecnológico](#2-stack-tecnológico)
3. [Arquitectura general](#3-arquitectura-general)
4. [Estructura de repositorios](#4-estructura-de-repositorios)
5. [Funcionalidades completas](#5-funcionalidades-completas)
6. [Modelo de datos (PostgreSQL)](#6-modelo-de-datos-postgresql)
7. [API y endpoints principales](#7-api-y-endpoints-principales)
8. [Eventos WebSocket](#8-eventos-websocket)
9. [Plan por fases](#9-plan-por-fases)
10. [Requerimientos no funcionales](#10-requerimientos-no-funcionales)
11. [Prompt para Claude Code](#11-prompt-para-claude-code)

---

## 1. Resumen del proyecto

Aplicación de mensajería instantánea con funcionalidades equivalentes a WhatsApp: chats individuales y grupales, mensajes multimedia, llamadas de voz y video, mensajes fijados y destacados, reenvío, personalización de la interfaz, y galería de medios por chat.

**Alcance v1:**
- Chats 1:1 y grupales con todas las operaciones (fijar, destacar, reenviar, editar, eliminar, reaccionar)
- Llamadas 1:1 de voz y video (WebRTC P2P, todo local)
- Galería de medios por chat (imágenes, videos, documentos, links, audios)
- Personalización completa de la UI (modo oscuro, fondos por chat, etc.)
- Archivos almacenados como `BYTEA` directamente en PostgreSQL (todo local, sin S3)

**Fuera de alcance v1:**
- Cifrado extremo a extremo
- Notificaciones push móviles (solo Notification API del navegador)
- Estados/Stories
- Llamadas grupales (requieren SFU)
- Envío de SMS/OTP (autenticación simple con email + contraseña)

**Restricciones explícitas:**
- Proyecto 100% local — ni S3, ni Cloudflare, ni servicios en la nube
- Sin Twilio, sin Firebase, sin OTP
- Monolito Spring Boot, no microservicios
- **Gradle** como build tool
- **Liquibase** como herramienta de migraciones
- Archivos almacenados en PostgreSQL con tipo `BYTEA`

---

## 2. Stack tecnológico

### Backend
- **Java 21**
- **Spring Boot 3.2**
- **Gradle** (Kotlin DSL o Groovy)
- **Spring Web** — API REST
- **Spring Security 6** — autenticación con JWT HS256 (clave simétrica)
- **Spring WebSocket (STOMP)** — mensajería en tiempo real
- **Spring Data JPA + Hibernate** — persistencia
- **Liquibase** — migraciones de base de datos (XML o YAML)
- **PostgreSQL JDBC driver**
- **JJWT 0.12** — generación y validación de JWT
- **BCrypt** — hash de contraseñas (incluido en Spring Security)
- **MapStruct** — mapeo entity ↔ DTO
- **Lombok** — reducir boilerplate
- **Jsoup** — parseo de Open Graph para preview de links

### Frontend
- **React 18**
- **Vite**
- **TypeScript**
- **Tailwind CSS** — estilos
- **Zustand** — estado global
- **TanStack React Query** — cache y sincronización REST
- **@stomp/stompjs** + **sockjs-client** — cliente WebSocket STOMP
- **React Router v6** — routing
- **WebRTC API** — llamadas P2P (nativo del navegador)
- **axios** — cliente HTTP
- **react-hook-form** + **zod** — formularios y validación
- **emoji-picker-react** — selector de emojis
- **wavesurfer.js** — waveform de mensajes de audio

### Infraestructura local
- **PostgreSQL 16** — base de datos, contiene todo (datos + archivos en `BYTEA`)
- **Docker Compose** — para levantar solo PostgreSQL
- Sin Redis en v1 (SimpleBroker de Spring STOMP es suficiente para un solo nodo)
- Sin TURN server (las llamadas son P2P en red local)

---

## 3. Arquitectura general

```
┌──────────────────────────────────────────────────────┐
│         FRONTEND — React + Vite (localhost:5173)     │
│   UI · Zustand · React Query · STOMP · WebRTC        │
└──────────────────────────┬───────────────────────────┘
                           │ HTTP / WebSocket
                           ▼
┌──────────────────────────────────────────────────────┐
│        BACKEND — Spring Boot (localhost:8080)        │
│                                                      │
│   ┌────────────────────────────────────────────┐    │
│   │  Controllers REST                          │    │
│   │  - AuthController                          │    │
│   │  - ChatController                          │    │
│   │  - MessageController                       │    │
│   │  - MediaController (upload/download bytea) │    │
│   │  - GroupController                         │    │
│   │  - CallController (signaling WebRTC)       │    │
│   │  - UserController                          │    │
│   │  - SettingsController                      │    │
│   └────────────────────────────────────────────┘    │
│                                                      │
│   ┌────────────────────────────────────────────┐    │
│   │  WebSocket STOMP (SimpleBroker)            │    │
│   │  - ChatWebSocketController                 │    │
│   │  - CallSignalingController                 │    │
│   │  - PresenceTracker                         │    │
│   └────────────────────────────────────────────┘    │
│                                                      │
│   Services · Repositories · Entities · Security      │
└──────────────────────────┬───────────────────────────┘
                           │ JDBC
                           ▼
┌──────────────────────────────────────────────────────┐
│          PostgreSQL 16 (localhost:5432)              │
│   Datos relacionales + archivos como BYTEA           │
└──────────────────────────────────────────────────────┘
```

### Organización del backend (paquetes por dominio)

```
com.app.chat/
├── ChatApplication.java
├── config/
│   ├── SecurityConfig.java
│   ├── WebSocketConfig.java
│   ├── CorsConfig.java
│   └── JacksonConfig.java
├── security/
│   ├── JwtService.java
│   ├── JwtAuthenticationFilter.java
│   ├── UserDetailsServiceImpl.java
│   └── SecurityUtils.java
├── auth/
│   ├── AuthController.java
│   ├── AuthService.java
│   ├── dto/
│   └── exception/
├── user/
│   ├── User.java
│   ├── UserController.java
│   ├── UserService.java
│   ├── UserRepository.java
│   └── dto/
├── chat/
│   ├── Chat.java
│   ├── ChatMember.java
│   ├── ChatController.java
│   ├── ChatService.java
│   ├── ChatRepository.java
│   ├── websocket/
│   │   └── ChatWebSocketController.java
│   └── dto/
├── message/
│   ├── Message.java
│   ├── MessageController.java
│   ├── MessageService.java
│   ├── MessageRepository.java
│   ├── StarredMessage.java
│   ├── MessageReaction.java
│   └── dto/
├── media/
│   ├── Attachment.java
│   ├── MediaController.java
│   ├── MediaService.java
│   ├── AttachmentRepository.java
│   └── dto/
├── call/
│   ├── Call.java
│   ├── CallController.java
│   ├── CallService.java
│   ├── CallRepository.java
│   ├── signaling/
│   │   └── CallSignalingController.java
│   └── dto/
├── group/
│   ├── GroupController.java
│   └── GroupService.java
├── settings/
│   ├── UserPreferences.java
│   ├── SettingsController.java
│   └── SettingsService.java
├── presence/
│   └── PresenceTracker.java
└── common/
    ├── exception/
    │   ├── GlobalExceptionHandler.java
    │   └── ...
    ├── dto/
    └── util/
```

---

## 4. Estructura de repositorios

**Decisión:** repositorios separados (backend y frontend).

### Repositorio backend

```
chat-backend/
├── build.gradle                     ← Gradle (Groovy DSL)
├── settings.gradle
├── gradlew / gradlew.bat
├── docker-compose.yml               ← solo postgres
├── README.md
└── src/
    ├── main/
    │   ├── java/com/app/chat/
    │   └── resources/
    │       ├── application.yml
    │       ├── application-dev.yml
    │       └── db/changelog/
    │           ├── db.changelog-master.xml
    │           ├── changes/
    │           │   ├── 001-create-users.xml
    │           │   ├── 002-create-chats.xml
    │           │   ├── 003-create-messages.xml
    │           │   ├── 004-create-attachments.xml
    │           │   ├── 005-create-calls.xml
    │           │   ├── 006-create-reactions.xml
    │           │   ├── 007-create-starred.xml
    │           │   └── 008-create-preferences.xml
    │           └── data/
    │               └── seed-dev.xml
    └── test/
        └── java/com/app/chat/
```

### Repositorio frontend

```
chat-frontend/
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── .env.example
├── README.md
├── public/
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── routes/
    ├── features/
    │   ├── auth/
    │   ├── chat/
    │   │   └── components/
    │   │       ├── ChatList.tsx
    │   │       ├── ChatWindow.tsx
    │   │       ├── MessageBubble.tsx
    │   │       ├── PinnedMessageBanner.tsx
    │   │       ├── ReplyPreview.tsx
    │   │       ├── ForwardDialog.tsx
    │   │       └── StarredMessagesView.tsx
    │   ├── calls/
    │   │   └── hooks/useWebRTC.ts
    │   ├── media/
    │   │   └── components/
    │   │       ├── MediaGallery.tsx
    │   │       ├── DocumentsTab.tsx
    │   │       ├── LinksTab.tsx
    │   │       └── AudiosTab.tsx
    │   ├── groups/
    │   ├── contacts/
    │   └── settings/
    │       ├── ThemeSettings.tsx
    │       ├── ChatWallpaper.tsx
    │       └── PrivacySettings.tsx
    ├── components/                   ← UI compartida
    ├── hooks/
    │   ├── useSocket.ts
    │   ├── useTheme.ts
    │   └── useAuth.ts
    ├── lib/
    │   ├── axios.ts
    │   └── socket.ts
    ├── store/
    ├── types/
    └── utils/
```

---

## 5. Funcionalidades completas

### 5.1 Autenticación y perfil (7)
- [ ] Registro con email + contraseña (sin OTP, sin SMS)
- [ ] Login con email + contraseña, retorna JWT
- [ ] Foto de perfil (subir, eliminar) — almacenada como `BYTEA`
- [ ] Nombre de usuario y texto de estado ("Hola, estoy usando...")
- [ ] Sesión persistente con JWT access + refresh token
- [ ] Cerrar sesión (revoca refresh token)
- [ ] Bloquear/desbloquear contactos

### 5.2 Mensajería individual y grupal (20)
- [ ] Enviar y recibir mensajes de texto en tiempo real (WebSocket STOMP)
- [ ] Ticks de estado: ✓ enviado · ✓✓ entregado · ✓✓ azul leído
- [ ] Responder a un mensaje (cita el original en la burbuja)
- [ ] Reenviar mensaje a uno o varios chats, con etiqueta "Reenviado"
- [ ] **Fijar mensaje** — banner sticky arriba del chat
- [ ] Desfijar mensaje (admins en grupos, cualquiera en privados)
- [ ] **Destacar mensaje** — guardado por usuario, sección aparte
- [ ] Ver lista de mensajes destacados del chat
- [ ] Eliminar mensaje — "para mí" o "para todos" (con tiempo límite)
- [ ] Editar mensaje — con historial de ediciones
- [ ] Reacciones con emoji (mantener presionado para picker)
- [ ] Ver quién reaccionó y con qué emoji
- [ ] Indicador "escribiendo..." por usuario
- [ ] Indicador "en línea" / "última vez visto"
- [ ] Buscar en el chat (full-text search con `tsvector` de Postgres)
- [ ] Paginación del historial (cursor-based, lazy loading al scrollear arriba)
- [ ] Scroll al mensaje citado cuando se hace clic en la cita
- [ ] Preview de links (fetch server-side de Open Graph con Jsoup)
- [ ] Contador de mensajes no leídos (badge en lista de chats)
- [ ] Archivar y silenciar chats

### 5.3 Multimedia y archivos (10)
- [ ] Enviar imágenes (almacenadas como `BYTEA`, con compresión client-side antes de subir)
- [ ] Enviar videos con preview y reproductor inline (servidos como blob)
- [ ] Enviar documentos (PDF, DOC, ZIP) con nombre e icono
- [ ] Grabar y enviar mensajes de audio con waveform y velocidad 1x/2x
- [ ] **Pestaña Medios del chat** — galería de todas las imágenes y videos
- [ ] **Pestaña Documentos** — lista de archivos enviados con opción de descarga
- [ ] **Pestaña Links** — todos los enlaces compartidos en el chat
- [ ] **Pestaña Audios** — lista de notas de voz del chat
- [ ] Descargar archivo desde galería o desde mensaje
- [ ] Reenviar archivo a otro chat sin duplicar el `BYTEA` (referencia por `attachmentId`)

### 5.4 Llamadas de voz y video (7)
- [ ] Llamada de voz 1:1 con silenciar, altavoz, colgar
- [ ] Videollamada 1:1 con cámara on/off, voltear cámara, picture-in-picture
- [ ] Pantalla de llamada entrante con aceptar/rechazar/silenciar tono
- [ ] Notificación de llamada perdida (mensaje de sistema en el chat)
- [ ] Historial de llamadas (perdidas, realizadas, recibidas)
- [ ] Duración de llamada visible en pantalla y en historial
- [ ] Escalar de llamada de voz a videollamada en vivo

### 5.5 Grupos (8)
- [ ] Crear grupo con nombre, foto, descripción
- [ ] Añadir y eliminar miembros (solo admins)
- [ ] Roles: admin y miembro con permisos diferenciados
- [ ] Link de invitación al grupo (código único)
- [ ] Salir del grupo con traspaso de admin si es el último
- [ ] Pantalla de info del grupo (miembros, media compartida)
- [ ] Menciones @usuario con notificación directa
- [ ] Silenciar grupo por 8h / 1 semana / siempre

### 5.6 Personalización de la UI (6)
- [ ] **Modo oscuro / claro** — por sistema o manual, persistente
- [ ] **Fondo personalizado por chat** — color, gradiente o imagen propia (BYTEA)
- [ ] Fondo global de chats (aplica a chats sin fondo propio)
- [ ] Tamaño de fuente: pequeño / normal / grande
- [ ] Color de burbujas propias personalizable
- [ ] Galería de fondos predefinidos (patrones y colores hardcoded en el frontend)

### 5.7 Privacidad y configuración (7)
- [ ] Notificaciones del navegador vía Notification API (sin FCM)
- [ ] Silenciar notificaciones por chat: 8h / 1 semana / siempre
- [ ] Privacidad — última vez visto: todos / contactos / nadie
- [ ] Privacidad — foto de perfil: todos / contactos / nadie
- [ ] Privacidad — ticks de lectura: activar/desactivar ✓✓ azul
- [ ] Confirmación de lectura en grupos (ver quién leyó)
- [ ] Exportar historial de chat en .txt o .zip con media

**Total: 65 funcionalidades**

---

## 6. Modelo de datos (PostgreSQL)

### Tablas principales

```sql
-- Usuarios
CREATE TABLE users (
    id                    BIGSERIAL PRIMARY KEY,
    email                 VARCHAR(150) UNIQUE NOT NULL,
    password_hash         VARCHAR(255) NOT NULL,
    name                  VARCHAR(100) NOT NULL,
    avatar                BYTEA,
    avatar_mime_type      VARCHAR(50),
    status_text           VARCHAR(140) DEFAULT 'Hola, estoy usando la app',
    last_seen             TIMESTAMP,
    is_online             BOOLEAN DEFAULT FALSE,
    privacy_last_seen     VARCHAR(20) DEFAULT 'EVERYONE',
    privacy_profile_pic   VARCHAR(20) DEFAULT 'EVERYONE',
    privacy_read_receipts BOOLEAN DEFAULT TRUE,
    created_at            TIMESTAMP DEFAULT NOW(),
    updated_at            TIMESTAMP DEFAULT NOW()
);

-- Refresh tokens
CREATE TABLE refresh_tokens (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token           VARCHAR(500) UNIQUE NOT NULL,
    expires_at      TIMESTAMP NOT NULL,
    revoked         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Chats (individuales y grupales)
CREATE TABLE chats (
    id                  BIGSERIAL PRIMARY KEY,
    type                VARCHAR(10) NOT NULL, -- 'PRIVATE' | 'GROUP'
    name                VARCHAR(100),
    description         TEXT,
    avatar              BYTEA,
    avatar_mime_type    VARCHAR(50),
    created_by          BIGINT REFERENCES users(id),
    invite_code         VARCHAR(32) UNIQUE,
    created_at          TIMESTAMP DEFAULT NOW()
);

-- Miembros de chat
CREATE TABLE chat_members (
    chat_id                BIGINT REFERENCES chats(id) ON DELETE CASCADE,
    user_id                BIGINT REFERENCES users(id),
    role                   VARCHAR(10) DEFAULT 'MEMBER', -- 'ADMIN' | 'MEMBER'
    joined_at              TIMESTAMP DEFAULT NOW(),
    muted_until            TIMESTAMP,
    is_archived            BOOLEAN DEFAULT FALSE,
    custom_wallpaper       BYTEA,
    custom_wallpaper_mime  VARCHAR(50),
    PRIMARY KEY (chat_id, user_id)
);

-- Mensajes
CREATE TABLE messages (
    id                      BIGSERIAL PRIMARY KEY,
    chat_id                 BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id               BIGINT NOT NULL REFERENCES users(id),
    content                 TEXT,
    type                    VARCHAR(20) DEFAULT 'TEXT', -- TEXT | IMAGE | VIDEO | AUDIO | DOCUMENT | SYSTEM
    reply_to_id             BIGINT REFERENCES messages(id),
    forwarded_from_id       BIGINT REFERENCES messages(id),
    is_pinned               BOOLEAN DEFAULT FALSE,
    pinned_at               TIMESTAMP,
    pinned_by               BIGINT REFERENCES users(id),
    edited_at               TIMESTAMP,
    deleted_at              TIMESTAMP,
    deleted_for_everyone    BOOLEAN DEFAULT FALSE,
    content_tsv             TSVECTOR,
    created_at              TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_chat_created ON messages(chat_id, created_at DESC);
CREATE INDEX idx_messages_chat_pinned ON messages(chat_id, is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX idx_messages_tsv ON messages USING GIN(content_tsv);

-- Trigger para mantener tsvector actualizado
CREATE OR REPLACE FUNCTION messages_tsv_trigger() RETURNS trigger AS $$
BEGIN
  NEW.content_tsv := to_tsvector('spanish', COALESCE(NEW.content, ''));
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION messages_tsv_trigger();

-- Historial de ediciones
CREATE TABLE message_edits (
    id              BIGSERIAL PRIMARY KEY,
    message_id      BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    previous_content TEXT,
    edited_at       TIMESTAMP DEFAULT NOW()
);

-- Mensajes destacados (por usuario)
CREATE TABLE starred_messages (
    user_id         BIGINT REFERENCES users(id),
    message_id      BIGINT REFERENCES messages(id) ON DELETE CASCADE,
    starred_at      TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, message_id)
);

CREATE INDEX idx_starred_user ON starred_messages(user_id, starred_at DESC);

-- Estados de lectura y entrega
CREATE TABLE message_reads (
    message_id      BIGINT REFERENCES messages(id) ON DELETE CASCADE,
    user_id         BIGINT REFERENCES users(id),
    read_at         TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (message_id, user_id)
);

CREATE TABLE message_deliveries (
    message_id      BIGINT REFERENCES messages(id) ON DELETE CASCADE,
    user_id         BIGINT REFERENCES users(id),
    delivered_at    TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (message_id, user_id)
);

-- Archivos adjuntos (almacenados como BYTEA)
CREATE TABLE attachments (
    id                  BIGSERIAL PRIMARY KEY,
    message_id          BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    data                BYTEA NOT NULL,
    type                VARCHAR(20) NOT NULL, -- IMAGE | VIDEO | AUDIO | DOCUMENT
    mime_type           VARCHAR(100),
    size_bytes          BIGINT,
    filename            VARCHAR(255),
    thumbnail           BYTEA,
    thumbnail_mime_type VARCHAR(50),
    duration_seconds    INT,
    width               INT,
    height              INT,
    waveform            JSONB,
    created_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_attachments_message ON attachments(message_id);
CREATE INDEX idx_attachments_type ON attachments(type);

-- Links compartidos (cache de Open Graph)
CREATE TABLE message_links (
    id              BIGSERIAL PRIMARY KEY,
    message_id      BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    url             TEXT NOT NULL,
    title           TEXT,
    description     TEXT,
    image_url       TEXT,
    site_name       VARCHAR(100)
);

-- Reacciones
CREATE TABLE message_reactions (
    message_id      BIGINT REFERENCES messages(id) ON DELETE CASCADE,
    user_id         BIGINT REFERENCES users(id),
    emoji           VARCHAR(10) NOT NULL,
    reacted_at      TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (message_id, user_id, emoji)
);

-- Llamadas
CREATE TABLE calls (
    id                  BIGSERIAL PRIMARY KEY,
    chat_id             BIGINT REFERENCES chats(id),
    caller_id           BIGINT NOT NULL REFERENCES users(id),
    callee_id           BIGINT NOT NULL REFERENCES users(id),
    type                VARCHAR(10) NOT NULL, -- VOICE | VIDEO
    status              VARCHAR(20) NOT NULL, -- RINGING | ONGOING | ENDED | MISSED | REJECTED
    started_at          TIMESTAMP,
    ended_at            TIMESTAMP,
    duration_seconds    INT
);

-- Bloqueos
CREATE TABLE blocked_users (
    blocker_id      BIGINT REFERENCES users(id),
    blocked_id      BIGINT REFERENCES users(id),
    blocked_at      TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (blocker_id, blocked_id)
);

-- Preferencias del usuario
CREATE TABLE user_preferences (
    user_id                  BIGINT PRIMARY KEY REFERENCES users(id),
    theme                    VARCHAR(10) DEFAULT 'SYSTEM', -- LIGHT | DARK | SYSTEM
    font_size                VARCHAR(10) DEFAULT 'NORMAL',
    bubble_color             VARCHAR(20),
    global_wallpaper         BYTEA,
    global_wallpaper_mime    VARCHAR(50),
    language                 VARCHAR(5) DEFAULT 'es'
);
```

### Índices críticos de performance

| Índice | Razón |
|---|---|
| `messages(chat_id, created_at DESC)` | paginación del historial |
| `messages(chat_id, is_pinned) WHERE is_pinned` | mensajes fijados |
| `messages USING GIN(content_tsv)` | búsqueda full-text |
| `starred_messages(user_id, starred_at DESC)` | destacados por usuario |
| `attachments(message_id)` | archivos por mensaje |
| `attachments(type)` | galería por tipo |

### Notas importantes sobre BYTEA y performance

- **Límite práctico por archivo:** 50 MB. Si se sube más grande, rechazar desde el frontend y el backend.
- **Streaming al descargar:** usar `StreamingResponseBody` o `Resource` de Spring para no cargar todo el archivo en memoria.
- **NUNCA cargar el BYTEA en las queries normales:** el campo `data` de `Attachment` debe tener `@Basic(fetch = FetchType.LAZY)`. Solo se carga en el endpoint de descarga.
- **Usa proyecciones JPA o `@EntityGraph`** para listar attachments en la galería sin traer los bytes.
- **Content-Type correcto:** retornar el `mime_type` guardado en el header `Content-Type` al servir.
- **Cache-Control:** las imágenes/videos pueden cachearse en el navegador con `Cache-Control: private, max-age=3600`.
- **Compresión client-side:** antes de subir una imagen, redimensionar/comprimir en el navegador con canvas (p. ej. max 1920px de lado, JPEG quality 80).

---

## 7. API y endpoints principales

### Auth — `/api/auth`

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/register` | Registro con email + password + nombre |
| POST | `/login` | Login, retorna access + refresh token |
| POST | `/refresh` | Refrescar access token |
| POST | `/logout` | Invalidar refresh token |

### Usuarios — `/api/users`

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/me` | Perfil actual |
| PATCH | `/me` | Actualizar perfil (nombre, status) |
| POST | `/me/avatar` | Subir foto de perfil (multipart) |
| GET | `/{id}/avatar` | Servir foto de perfil |
| DELETE | `/me/avatar` | Eliminar foto de perfil |
| GET | `/search?q=` | Buscar usuarios por email o nombre |
| POST | `/{id}/block` | Bloquear usuario |
| DELETE | `/{id}/block` | Desbloquear |

### Chats — `/api/chats`

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/` | Lista de chats del usuario |
| POST | `/` | Crear chat privado |
| POST | `/groups` | Crear grupo |
| GET | `/{id}` | Info de un chat |
| PATCH | `/{id}` | Actualizar chat |
| DELETE | `/{id}` | Eliminar/salir de chat |
| GET | `/{id}/messages?cursor=&limit=50` | Historial paginado |
| GET | `/{id}/messages/search?q=` | Búsqueda full-text |
| GET | `/{id}/pinned` | Mensajes fijados |
| GET | `/{id}/starred` | Destacados del usuario en este chat |
| POST | `/{id}/members` | Añadir miembros (grupo) |
| DELETE | `/{id}/members/{userId}` | Eliminar miembro |
| PATCH | `/{id}/members/{userId}/role` | Cambiar rol |
| POST | `/{id}/archive` | Archivar chat |
| POST | `/{id}/mute` | Silenciar chat |
| PATCH | `/{id}/wallpaper` | Cambiar fondo (multipart) |
| POST | `/{id}/invite-link` | Generar link de invitación |
| POST | `/join/{code}` | Unirse por código |
| GET | `/{id}/avatar` | Servir avatar del grupo |

### Mensajes — `/api/messages`

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/` | Enviar mensaje (también vía WS) |
| PATCH | `/{id}` | Editar mensaje |
| DELETE | `/{id}?forEveryone=true` | Eliminar mensaje |
| POST | `/{id}/pin` | Fijar mensaje |
| DELETE | `/{id}/pin` | Desfijar |
| POST | `/{id}/star` | Destacar mensaje |
| DELETE | `/{id}/star` | Quitar destacado |
| POST | `/{id}/forward` | Reenviar a otros chats (body: `chatIds[]`) |
| POST | `/{id}/reactions` | Reaccionar (body: `{emoji}`) |
| DELETE | `/{id}/reactions/{emoji}` | Quitar reacción |
| POST | `/{id}/read` | Marcar como leído |
| GET | `/starred` | Todos los destacados del usuario |

### Media — `/api/media`

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/upload` | Subir archivo (multipart), retorna `attachmentId` |
| GET | `/attachments/{id}` | Descargar archivo (streaming con mime_type) |
| GET | `/attachments/{id}/thumbnail` | Thumbnail del archivo |
| GET | `/chats/{id}/gallery?type=IMAGE\|VIDEO` | Galería del chat |
| GET | `/chats/{id}/documents` | Documentos del chat |
| GET | `/chats/{id}/links` | Links del chat |
| GET | `/chats/{id}/audios` | Audios del chat |

### Llamadas — `/api/calls`

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/initiate` | Iniciar llamada |
| POST | `/{id}/accept` | Aceptar |
| POST | `/{id}/reject` | Rechazar |
| POST | `/{id}/end` | Finalizar |
| GET | `/history` | Historial de llamadas |

### Settings — `/api/settings`

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/preferences` | Preferencias del usuario |
| PATCH | `/preferences` | Actualizar preferencias |
| PATCH | `/privacy` | Actualizar privacidad |
| POST | `/wallpaper` | Subir fondo global |
| GET | `/wallpaper` | Servir fondo global |

---

## 8. Eventos WebSocket

**Endpoint STOMP:** `ws://localhost:8080/ws`
**Destino cliente → servidor:** `/app/...`
**Suscripciones:** `/topic/...` (broadcast) o `/user/queue/...` (privado)

| Evento | Dirección | Destino | Payload |
|---|---|---|---|
| `MESSAGE_SEND` | C→S | `/app/chat.send` | `{chatId, content, type, replyToId?, attachmentIds?}` |
| `MESSAGE_NEW` | S→C | `/topic/chat.{chatId}` | MessageDTO completo |
| `MESSAGE_DELIVERED` | S→C | `/user/queue/messages` | `{messageId, userId, at}` |
| `MESSAGE_READ` | C→S / S→C | `/app/chat.read` / `/topic/chat.{chatId}.read` | `{messageId, userId, at}` |
| `MESSAGE_EDITED` | S→C | `/topic/chat.{chatId}` | `{messageId, newContent, editedAt}` |
| `MESSAGE_DELETED` | S→C | `/topic/chat.{chatId}` | `{messageId, forEveryone}` |
| `MESSAGE_PINNED` | S→C | `/topic/chat.{chatId}` | `{messageId, pinnedBy, at}` |
| `MESSAGE_UNPINNED` | S→C | `/topic/chat.{chatId}` | `{messageId}` |
| `REACTION_ADDED` | S→C | `/topic/chat.{chatId}` | `{messageId, userId, emoji}` |
| `REACTION_REMOVED` | S→C | `/topic/chat.{chatId}` | `{messageId, userId, emoji}` |
| `TYPING_START` | C→S / S→C | `/app/chat.typing.start` / `/topic/chat.{chatId}.typing` | `{chatId, userId}` |
| `TYPING_STOP` | C→S / S→C | `/app/chat.typing.stop` / `/topic/chat.{chatId}.typing` | `{chatId, userId}` |
| `USER_ONLINE` | S→C | `/topic/presence` | `{userId, online: true}` |
| `USER_OFFLINE` | S→C | `/topic/presence` | `{userId, online: false, lastSeen}` |
| `CALL_OFFER` | S→C | `/user/queue/calls` | `{callId, from, type, sdp}` |
| `CALL_ANSWER` | C→S | `/app/call.answer` | `{callId, sdp}` |
| `CALL_ICE_CANDIDATE` | C↔S | `/app/call.ice` / `/user/queue/calls` | `{callId, candidate}` |
| `CALL_ENDED` | S→C | `/user/queue/calls` | `{callId, reason}` |

### Nota sobre el broker STOMP

Spring Boot incluye un SimpleBroker in-memory (`enableSimpleBroker("/topic", "/queue")`) que funciona perfecto para un solo nodo. No necesitas Redis, RabbitMQ ni nada externo en v1.

---

## 9. Plan por fases

### Fase 1 — Fundación (semanas 1-2)
- Setup del proyecto backend con Gradle
- Setup del frontend React + Vite + TypeScript + Tailwind
- Docker Compose con solo PostgreSQL 16
- Configuración de Liquibase con `db.changelog-master.xml`
- Primera migración: `users`, `refresh_tokens`, `user_preferences`
- Spring Security 6 con JWT HS256
- `AuthController`: register, login, refresh, logout
- Exception handler global con `@ControllerAdvice` y `ProblemDetail`
- CORS para `http://localhost:5173`
- Frontend: pantallas de login y registro, interceptor axios con refresh automático

### Fase 2 — Estructura de chat (semanas 3-4)
- Migraciones: `chats`, `chat_members`, `messages`, `message_reads`, `message_deliveries`
- Entidades JPA con relaciones
- `ChatController`: crear chat privado, listar chats, obtener chat
- `MessageController`: enviar mensaje REST (fallback), obtener historial paginado
- Configuración de WebSocket STOMP con SimpleBroker
- `ChatWebSocketController`: `/app/chat.send` → `/topic/chat.{id}`
- Autenticación en WebSocket usando el JWT (en el header CONNECT)
- Frontend: ChatList, ChatWindow, MessageBubble, input básico
- Conexión STOMP desde el cliente, envío y recepción en tiempo real

### Fase 3 — Mensajería avanzada (semanas 5-6)
- Ticks de estado (enviado, entregado, leído) con eventos WS
- Responder mensaje (`reply_to_id`)
- Editar y eliminar mensaje (para mí / para todos)
- Historial de ediciones
- Typing indicators
- Presencia online/offline con `PresenceTracker` en memoria (ConcurrentHashMap)
- Reacciones con emoji
- Migración: `message_edits`, `message_reactions`
- Frontend: soporte visual de replies, edits, deletes, reactions

### Fase 4 — Fijar, destacar, reenviar, buscar (semanas 7-8)
- Fijar/desfijar mensaje (`is_pinned`)
- Endpoint `GET /chats/{id}/pinned`
- Banner sticky de mensaje fijado en el frontend
- Destacar/quitar destacado (tabla `starred_messages`)
- Vista de mensajes destacados por chat
- Reenviar mensaje a uno o varios chats (con flag de "Reenviado")
- Diálogo de selección de chats para reenviar
- Búsqueda full-text con `tsvector` y GIN index
- Scroll al mensaje citado (highlight + auto-scroll)

### Fase 5 — Multimedia con BYTEA (semanas 9-10)
- Migración: `attachments`, `message_links`
- Entidad `Attachment` con campo `data` anotado `@Basic(fetch = FetchType.LAZY)`
- `MediaController`:
  - `POST /api/media/upload` (multipart, retorna attachmentId)
  - `GET /api/media/attachments/{id}` con `StreamingResponseBody`
  - `GET /api/media/chats/{id}/gallery?type=`
- Límite de tamaño en `application.yml`: `spring.servlet.multipart.max-file-size=50MB`
- Generación de thumbnails server-side con ImageIO (para imágenes) y configurar ffmpeg si está instalado (opcional para videos)
- Preview de links: fetch server-side del HTML con HttpClient + parseo Open Graph con Jsoup
- Frontend: upload de archivos con compresión client-side, preview, reproductor de video/audio, waveform
- Pestañas del chat: Medios / Documentos / Links / Audios

### Fase 6 — Llamadas WebRTC (semanas 11-12)
- Migración: `calls`
- `CallSignalingController` con WebSocket:
  - Recibe offer, reenvía al callee
  - Recibe answer, reenvía al caller
  - Intercambia ICE candidates
- `CallController`: initiate, accept, reject, end, history
- Frontend: `useWebRTC` hook
- Pantalla de llamada entrante
- Pantalla de llamada activa (silenciar, cámara, voltear, PIP, colgar)
- Historial de llamadas
- Mensaje de sistema en el chat por llamadas perdidas
- Sin TURN server (funciona en red local o LAN)

### Fase 7 — Grupos (semanas 13-14)
- Crear grupo con foto y descripción
- Añadir/eliminar miembros (solo admin)
- Cambiar rol de miembro
- Link de invitación con código único
- Salir del grupo con traspaso automático de admin
- Menciones @usuario (parseo en el servidor, notificación al mencionado)
- Info del grupo con lista de miembros y media
- Silenciar grupo

### Fase 8 — Personalización (semana 15)
- Modo oscuro/claro con `prefers-color-scheme` + override manual
- Tokens de Tailwind con variables CSS
- Fondo personalizado por chat:
  - Subir imagen (BYTEA en `chat_members.custom_wallpaper`)
  - Elegir color sólido
  - Galería de fondos predefinidos (assets en el frontend)
- Fondo global (en `user_preferences`)
- Tamaño de fuente: 3 presets aplicados vía clase CSS en `<html>`
- Color de burbujas personalizable

### Fase 9 — Privacidad, notificaciones y exportación (semana 16)
- Privacidad: última vez, foto de perfil, ticks de lectura
- Bloquear/desbloquear contactos
- Notification API del navegador (request permission al login)
- Notificaciones de mensajes nuevos cuando la pestaña no está enfocada
- Silenciar notificaciones por chat
- Exportar historial de un chat como .zip (mensajes en .txt + carpeta con media extraída del BYTEA)

### Fase 10 — Pulido y testing (semana 17)
- Tests unitarios con JUnit 5 + Mockito en servicios clave
- Tests de integración con Testcontainers (PostgreSQL real)
- Tests E2E con Playwright (flujo: registro → chat → enviar archivo → llamada)
- Optimizaciones: revisar índices, resolver N+1 queries
- Verificar que los BYTEA no se cargan innecesariamente
- Documentación final y README actualizado

### Fase 12 — Cifrado Afín manual en el frontend (semana 18)

#### Contexto
El frontend cifra el texto plano con Cifrado Afín antes de enviarlo al backend. El backend **nunca recibe texto plano**; recibe `C1 = Afín(plaintext)`. Al recibir mensajes, el frontend receptor obtiene `C1` del backend y aplica Afín⁻¹ para recuperar el texto. Ver `ENCRYPTION.md` en la raíz del repositorio padre.

#### Implementación — Cifrado Afín manual (sin librerías)
- Módulo `src/lib/afin.ts` implementado puramente en TypeScript:
  - `encrypt(plaintext: string, a: number, b: number): string` — aplica `E(x) = (a·x + b) mod 256` byte a byte; el resultado se serializa como `'AFN:' + Base64` para distinguir ciphertext de texto plano
  - `decrypt(ciphertext: string, a: number, b: number): string` — aplica `D(y) = a⁻¹·(y − b) mod 256`; acepta tanto el formato `AFN:...` como Base64 crudo
  - `safeDecrypt(ciphertext, a, b)` — si el string no empieza por `'AFN:'` lo devuelve sin tocar (compatibilidad con mensajes sin cifrar); si empieza, llama `decrypt` en try/catch
  - `modInverse(a: number, m: number): number` — inverso modular con algoritmo de Euclides extendido
  - `isValidKey(a: number): boolean` — verifica que `a` sea impar y esté en `[3, 255]`
  - `deriveKey(userId: number): { a, b }` — deriva clave **determinista** del ID de usuario: `a = (userId % 127) * 2 + 3` (siempre impar, rango `[3, 255]`), `b = (userId * 37 + 11) % 256`

#### Gestión de clave
- La clave `(a, b)` se deriva del `user.id` con `deriveKey` en el momento del login/registro y se guarda en `encryptionStore` (Zustand, sin persist).
- Al recargar la página, `authStore` restaura el usuario desde `sessionStorage` y el callback `onRehydrateStorage` vuelve a llamar `deriveKey(user.id)` + `setKey`, de modo que la clave queda disponible antes de que el usuario envíe el primer mensaje.
- Al hacer logout, `authStore.clearAuth` llama `encryptionStore.clearKey()`.
- **Por qué clave derivada y no aleatoria**: con claves aleatorias por sesión, el mensaje cifrado por el usuario A no podría descifrarse por el usuario B (distinta clave). Al derivarla del `userId`, ambos usuarios pueden reconstruir la clave del emisor a partir de `senderId`, que viaja en el DTO de cada mensaje.

#### Integración en envío y recepción
- **Envío** (`ChatWindow.tsx`): `encryptContent(text)` lee `(a, b)` del `encryptionStore` y llama `encrypt`. Se aplica al `content` antes de `publish('/app/chat.send')` y antes de `chatApi.editMessage`.
- **Recepción WS** (`useSocket.ts`): `decryptContent(content, senderId)` llama `deriveKey(senderId)` y luego `safeDecrypt`. Se usa en `toMessage()`, en `MESSAGE_EDITED` (busca el `senderId` en el store) y en `useAllChatsNotifications`.
- **Historial** (`chatApi.ts`): `decryptMessage(msg)` llama `deriveKey(msg.senderId)` + `safeDecrypt` antes de retornar el DTO.
- Solo el campo `content` se cifra; `type`, `attachments`, `reactions` y demás campos viajan en claro.

#### Tests
- `src/lib/afin.test.ts`: round-trip ASCII, multibyte, emojis; todos los valores impares en `[3,255]`; `safeDecrypt` con prefijo ausente; mutation test (byte adulterado → salida diferente).

---

## 10. Requerimientos no funcionales

### Performance
- Tiempo de respuesta API REST: p95 < 200ms
- Latencia WebSocket: p95 < 100ms
- Paginación de mensajes: 50 por página (cursor-based)
- Cache de avatares en el navegador: `Cache-Control: private, max-age=3600`
- Archivos siempre en streaming con `StreamingResponseBody`
- `Attachment.data` con `@Basic(fetch = FetchType.LAZY)`

### Seguridad
- Contraseñas hasheadas con BCrypt (cost factor 10)
- JWT firmado con HS256, secreto en variable de entorno (mínimo 256 bits)
- Access token: 15 min · Refresh token: 30 días
- CORS configurado solo para `http://localhost:5173` en dev
- Validación de input con Bean Validation
- Autorización por rol en endpoints de grupos (solo admin puede eliminar miembros)
- **Cifrado en cadena (Fase 12):** el frontend aplica Cifrado Afín manualmente (sin librerías) sobre el texto plano antes de enviarlo. El backend nunca ve texto plano; solo recibe y reenvía `C1`. El receptor descifra Afín⁻¹ en el cliente. Ver `ENCRYPTION.md` en la raíz del repositorio padre.

### Observabilidad
- Logs estructurados con SLF4J + Logback
- Nivel DEBUG en dev, INFO en prod
- Actuator expuesto en `/actuator/health`

### Testing
- Unit tests con JUnit 5 + Mockito
- Integration tests con `@SpringBootTest` + Testcontainers
- E2E con Playwright
- Cobertura objetivo: 60% en servicios

### Limitaciones conocidas (aceptadas en v1)
- Archivos en BYTEA limita la BD a tamaños manejables (hasta ~10 GB de media antes de sentir la presión)
- Sin TURN server, las llamadas WebRTC solo funcionan en la misma red (LAN) o entre IPs públicas directas
- Sin notificaciones push móviles
- SimpleBroker de STOMP no escala horizontalmente (una sola instancia del backend)

---

## 11. Prompt para Claude Code

> Copia y pega este prompt en Claude Code para iniciar el desarrollo.

```
Voy a desarrollar una aplicación de mensajería tipo WhatsApp con Spring Boot 3 (monolito), React 18 y PostgreSQL 16. Todo corre local, sin servicios en la nube. Tengo nivel avanzado en Spring Boot. El proyecto usa repositorios separados: uno para backend y otro para frontend.

Lee primero el archivo PLANNING.md de la raíz para entender el alcance completo, la arquitectura, las 65 funcionalidades, el modelo de datos, los endpoints y el plan por fases.

RESTRICCIONES IMPORTANTES (respetalas estrictamente):
- Monolito Spring Boot, NO microservicios
- Gradle como build tool (NO Maven)
- Liquibase para migraciones (NO Flyway)
- Archivos almacenados como BYTEA en PostgreSQL (NO S3, NO MinIO, NO buckets externos)
- Autenticación simple con email + contraseña (NO OTP, NO SMS, NO Twilio)
- Sin Firebase, sin FCM, sin APNs (notificaciones solo con Notification API del navegador)
- Sin Redis en v1 (usar SimpleBroker de Spring STOMP, PresenceTracker en memoria con ConcurrentHashMap)
- Sin TURN server (WebRTC funciona en red local)

STACK:
- Backend: Java 21, Spring Boot 3.2, Gradle, Spring Web, Spring Security 6 (JWT HS256), Spring WebSocket (STOMP con SimpleBroker), Spring Data JPA, Liquibase, JJWT 0.12, MapStruct, Lombok, Jsoup
- Frontend: React 18, Vite, TypeScript, Tailwind CSS, Zustand, TanStack React Query, @stomp/stompjs + sockjs-client, WebRTC API nativa, axios, react-hook-form + zod
- Base de datos: PostgreSQL 16 (docker-compose con solo postgres)

ARQUITECTURA:
- Un solo backend Spring Boot con paquetes por dominio (auth, user, chat, message, media, call, group, settings, presence)
- Controllers REST + WebSocket STOMP en el mismo proyecto
- Archivos en tabla `attachments` con columna `data BYTEA`, servidos con StreamingResponseBody
- Campo `data` marcado con @Basic(fetch = FetchType.LAZY) para no cargarlo en queries normales
- JWT HS256 con secreto simétrico en variable de entorno

LO QUE QUIERO QUE HAGAS AHORA (FASE 1 — FUNDACIÓN):

1. Crear el proyecto backend `chat-backend/`:
   - build.gradle con todas las dependencias: spring-boot-starter-web, security, data-jpa, websocket, validation, actuator, liquibase-core, postgresql, jjwt-api, jjwt-impl, jjwt-jackson, mapstruct + processor, lombok + processor, jsoup
   - docker-compose.yml con solo PostgreSQL 16 (puerto 5432, volumen persistente, user/pass/db configurables)
   - application.yml y application-dev.yml (conexión a postgres, JWT secret, multipart hasta 50MB, liquibase changelog path)
   - Estructura de paquetes según el PLANNING: config, security, auth, user, chat, message, media, call, group, settings, presence, common
   - Configurar Liquibase con `db/changelog/db.changelog-master.xml` que hace include de archivos individuales en changes/
   - Primera migración (001-create-users.xml): tablas `users`, `refresh_tokens`, `user_preferences` con todos los campos que aparecen en la sección 6 del PLANNING
   - Seed de datos en `data/seed-dev.xml` con 3 usuarios de prueba (contraseñas hasheadas con BCrypt: password = "Test123!")

2. Configurar Spring Security 6 en el backend:
   - `SecurityConfig` con filter chain stateless
   - `JwtService` para firmar/validar tokens HS256 (usa JJWT 0.12 con la nueva API)
   - `JwtAuthenticationFilter` que extrae el token del header Authorization
   - `UserDetailsServiceImpl` que carga usuarios desde la BD
   - `BCryptPasswordEncoder` como PasswordEncoder bean
   - Endpoints públicos: `/api/auth/**`, `/actuator/health`
   - Todos los demás protegidos
   - CORS para `http://localhost:5173` con todos los headers y métodos permitidos

3. Implementar AuthController con endpoints:
   - POST /api/auth/register (body: email, password, name) → crea usuario y retorna tokens
   - POST /api/auth/login (body: email, password) → retorna access + refresh token
   - POST /api/auth/refresh (body: refreshToken) → nuevo access token
   - POST /api/auth/logout (body: refreshToken) → marca refresh token como revocado
   - Validación con Bean Validation en los DTOs (email válido, password mínimo 8 chars con mayúscula/número/símbolo, name no vacío)
   - Manejo de excepciones con @ControllerAdvice global que retorna ProblemDetail

4. Crear el proyecto frontend `chat-frontend/`:
   - Vite + React 18 + TypeScript + Tailwind CSS
   - Carpetas: features/, components/, hooks/, lib/, store/, types/, utils/, routes/
   - Configuración de axios con interceptor que agrega el JWT y hace refresh automático en caso de 401
   - Setup de Zustand con persist middleware para auth y preferencias
   - Setup de React Query con default staleTime de 30s
   - Setup de React Router v6
   - Variables de entorno en .env.example con VITE_API_URL=http://localhost:8080
   - Implementar pantallas:
     - /register — formulario email + password + name (validación con zod, password strength indicator)
     - /login — formulario email + password
     - AuthGuard que redirige a /login si no hay sesión válida
     - Layout base con sidebar placeholder y área principal vacía

5. README.md en ambos repos con instrucciones de arranque:
   - Backend: docker-compose up -d, ./gradlew bootRun
   - Frontend: npm install, npm run dev
   - Credenciales de los 3 usuarios seed para probar

Trabaja fase por fase. Cuando termines la Fase 1, muéstrame qué creaste, haz un resumen de los endpoints funcionando, prueba el flujo login/register con curl y espera confirmación antes de pasar a la Fase 2.

CONVENCIONES:
- Código en inglés (clases, métodos, variables, comentarios)
- Documentación al usuario en español
- Commits semánticos (feat:, fix:, chore:, docs:, refactor:, test:)
- Lombok para reducir boilerplate (@Data, @Builder, @RequiredArgsConstructor, @Slf4j)
- MapStruct para mapeo entity ↔ DTO
- DTOs con records (Java 17+)
- Bean Validation en request DTOs
- Exception handler global con ProblemDetail (RFC 7807)
- Logs estructurados con SLF4J
- Tests unitarios para servicios clave (JUnit 5 + Mockito)
- En JPA: siempre usar FetchType.LAZY por defecto, @Basic(fetch = LAZY) en campos BYTEA
- En Liquibase: un archivo XML por tabla/cambio mayor, todos incluidos desde db.changelog-master.xml
```
