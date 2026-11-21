/**
 * FynnCloud App Bridge (@fynncloud/app-bridge).
 *
 * Frontend browser library for apps running inside a sandboxed iframe.
 * Communicates bidirectionally with the FynnCloud host UI via `window.postMessage`.
 *
 * NOTE: This is a client-side UI bridge, not a backend SDK.
 * Server-side code communicates with FynnCloud via HTTP REST and proxy headers.
 */

export type BridgeTheme = 'dark' | 'light';
export type BridgeSidebarMode = 'rail' | 'integrated';
export type BridgeToastType = 'info' | 'success' | 'warning' | 'error';
export type BridgePresenceMode = 'auto' | 'online' | 'busy' | 'dnd' | 'away' | 'offline';
export type BridgePresenceStatus = 'online' | 'busy' | 'dnd' | 'away' | 'offline';

export interface BridgePresenceEntry {
    userId: string;
    status: BridgePresenceStatus;
    presenceMode: BridgePresenceMode;
    activity?: string | null;
    activityAppId?: string | null;
    activityLabel?: string | null;
    statusMessage?: string | null;
    statusExpiresAt?: string | null;
    lastSeenAt?: string | null;
}

export interface BridgeAppIntegration {
    id: string;
    name?: string | null;
    version?: string | null;
    requiredVersion: string;
    access: 'read' | 'write';
    optional: boolean;
    installed: boolean;
    runnable: boolean;
    compatible: boolean;
    available: boolean;
}

export interface BridgeUser {
    id: string;
    username?: string;
    displayName?: string | null;
    avatarUpdatedAt?: string | null;
    status?: BridgePresenceStatus;
    presenceMode?: BridgePresenceMode;
    statusMessage?: string | null;
    activity?: string | null;
    activityLabel?: string | null;
}

export interface BridgeContext {
    appId: string | null;
    theme: BridgeTheme;
    primaryColor: string;
    locale: string;
    token: string | null;
    apiBase?: string | null;
    /** FynnCloud version of the host. */
    version?: string | null;
    subroute?: string;
    sidebarMode?: BridgeSidebarMode;
    readOnly?: boolean;
    /** Whether this frame holds a realtime stream slot (false when hidden/non-leader or over browser stream cap). */
    realtimeStream?: boolean;
    /**
     * Whether the host forwards app real-time events into this frame (`onRealtime`). When true, an app
     * whose backend publishes via `POST /api/apps/realtime/publish` needs no event connection of its own.
     */
    hostRealtime?: boolean;
    /** Whether the host browser tab is currently hidden. */
    hostHidden?: boolean;
    user: BridgeUser | null;
    /** Compatible target apps declared in this app's `compatibility.apps` manifest field. */
    integrations?: BridgeAppIntegration[];
    fileAction: Record<string, any> | null;
    fileId: string | null;
    fileName: string | null;
}

export interface BridgeNavigateOptions {
    external?: boolean;
    replaceState?: boolean;
}

export interface BridgeAppBadge {
    count?: number;
    dot?: 'emerald' | 'amber' | 'red' | 'primary';
    pulse?: boolean;
    tooltip?: string;
}

export interface BridgeSessionAction {
    id: string;
    label: string;
    icon?: string;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    active?: boolean;
}

export interface BridgeActiveSession {
    /** Short session title shown in the host mini-bar (e.g. room name, track title, timer name). */
    title: string;
    /** Optional secondary text (e.g. participant count, status summary). */
    subtitle?: string;
    /** Optional icon override (defaults to the app's icon). */
    icon?: string;
    /** Semantic session state used for subtle status indicators on the host mini-bar and app rail. */
    status?: 'live' | 'playing' | 'recording' | 'active';
    /** Unix timestamp in ms when the session started; renders a live elapsed timer in the host mini-bar. */
    startedAt?: number;
    /** Optional static status badge text when `startedAt` is not used. */
    statusText?: string;
    /** App subroute or host path to navigate to when the user clicks the mini-bar (e.g. `/direct/123`). */
    returnPath?: string;
    /** Keep the app's sandboxed iframe mounted while the user navigates elsewhere in FynnCloud. Defaults to `true`. */
    keepAlive?: boolean;
    /** Quick-action buttons rendered in the host mini-bar; clicking one emits `sessionAction` to the app. */
    actions?: BridgeSessionAction[];
}

export interface BridgeConfirmOptions {
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'primary' | 'danger';
}

export interface BridgeFilePickerOptions {
    multiple?: boolean;
    /** Optional MIME type prefixes or extensions, e.g. `['image/*', '.pdf']`. */
    accept?: string[];
    title?: string;
}

export interface BridgePickedFile {
    id: string;
    name: string;
    sizeBytes?: number;
    size?: string;
    mimeType?: string;
    type?: string;
    hasThumbnail?: boolean;
}

export type BridgeNotificationSound = 'none' | 'chime' | 'loop';

export interface BridgeNotificationAction {
    id: string;
    label: string;
    icon?: string;
    variant?: 'primary' | 'secondary' | 'danger';
    /** Whether clicking this action navigates the host to `route`. Defaults to `true` for `'primary'`, `false` for `'danger'`. */
    navigate?: boolean;
    /** Optional per-action route override (app-relative or `/apps/...` path). */
    route?: string;
}

export interface BridgeNotificationOptions {
    /** Optional stable identifier (scoped per app) used to update or dismiss an active notification in place. */
    id?: string;
    title: string;
    body?: string;
    type?: BridgeToastType;
    /** Optional short avatar/initials badge text (e.g. `"AM"`) shown on persistent notification cards. */
    avatarText?: string;
    /** Optional user avatar image URL (e.g. `/api/user/<id>/avatar?v=...`) shown on persistent notification cards. */
    avatarUrl?: string;
    /** Optional icon name override shown on the notification badge. */
    icon?: string;
    /** App subroute (e.g. `/direct/123`) or host path (`/apps/...`) to open when activated. */
    route?: string;
    actionLabel?: string;
    /** Interactive action buttons; clicking one emits `'notificationAction'` (`{ id, actionId, route? }`) to the app. */
    actions?: BridgeNotificationAction[];
    /** Keep pinned in a non-modal top-layer card until dismissed or `expiresAt` is reached. */
    persistent?: boolean;
    /** Unix timestamp in ms when a persistent notification automatically expires. */
    expiresAt?: number;
    /** Optional host audio cue (`'none'` default, `'chime'` one-shot cue, `'loop'` repeating alert chime with mute control). */
    sound?: BridgeNotificationSound;
    /** Optional deduplication tag for desktop notifications. */
    tag?: string;
    /** Also trigger a browser desktop notification when the tab is hidden/unfocused. */
    desktop?: boolean;
}

export interface StorageClient {
    get<T = any>(key: string): Promise<T | null>;
    set(key: string, value: any): Promise<boolean>;
    delete(key: string): Promise<boolean>;
}

export type BridgeEventHandler<T = any> = (data: T) => void;
export type UnsubscribeFn = () => void;

/** An app real-time event published by the app's backend through `POST /api/apps/realtime/publish`. */
export interface BridgeRealtimeEvent<T = any> {
    event: string;
    data: T;
}

interface Pending {
    resolve: (value: any) => void;
    reject: (reason: Error) => void;
    timer: ReturnType<typeof setTimeout> | null;
}

const INTERACTIVE_RPC_TIMEOUT_MS = 10 * 60 * 1000;

export class FynnCloudBridge {
    private pendingRequests = new Map<string, Pending>();
    private listeners = new Map<string, BridgeEventHandler[]>();

    context: BridgeContext = {
        appId: null,
        theme: 'dark',
        primaryColor: '#6366f1',
        locale: 'en',
        token: null,
        subroute: '',
        sidebarMode: 'integrated',
        readOnly: false,
        realtimeStream: true,
        hostRealtime: false,
        hostHidden: false,
        user: null,
        integrations: [],
        fileAction: null,
        fileId: null,
        fileName: null
    };

    constructor() {
        if (typeof window !== 'undefined') {
            window.addEventListener('message', this.handleMessage.bind(this));
            window.addEventListener('popstate', () => {
                this.reportPath();
            });
        }
    }

    private reportPath(): void {
        if (typeof window === 'undefined') return;
        const subpath = window.location.pathname;
        const match = subpath.match(/\/api\/apps\/[^/]+\/proxy(.*)/);
        const currentPath = match ? match[1] || '/' : subpath;
        this.postMessage({
            type: 'fynncloud:ready',
            payload: { path: currentPath }
        });
    }

    /**
     * Initializes the bridge and signals readiness to the FynnCloud host.
     */
    init(): this {
        this.reportPath();
        return this;
    }

    private handleMessage(event: MessageEvent): void {
        // Only the FynnCloud host (our parent window) may talk to us. Without this, any other window
        // that holds a reference to this frame could inject a token or a file action.
        if (typeof window !== 'undefined' && window.parent !== window && event.source !== window.parent) return;

        const data = event.data;
        if (!data || typeof data.type !== 'string') return;

        // Handle RPC responses
        if (data.requestId && this.pendingRequests.has(data.requestId)) {
            const pending = this.pendingRequests.get(data.requestId)!;
            this.pendingRequests.delete(data.requestId);
            if (pending.timer) clearTimeout(pending.timer);
            if (data.error) {
                pending.reject(new Error(data.error));
            } else {
                pending.resolve(data.payload);
            }
            return;
        }

        // Handle Host Broadcasts
        switch (data.type) {
            case 'fynncloud:init': {
                const payload = data.payload || {};
                this.context = {
                    ...this.context,
                    ...payload,
                    version: payload.version || null
                };
                this.applyTheme(this.context.theme);
                this.emit('init', this.context);
                break;
            }

            case 'fynncloud:tokenRefresh':
                if (data.payload?.token) {
                    this.context.token = data.payload.token;
                    this.emit('tokenRefresh', data.payload.token);
                }
                break;

            case 'fynncloud:tokenError':
                // The host could not renew the session token; the current token will expire soon.
                this.emit('tokenError', { reason: data.payload?.reason ?? 'Failed to refresh app session token' });
                break;

            case 'fynncloud:fileAction':
                this.context.fileAction = data.payload;
                this.emit('fileAction', data.payload);
                break;

            case 'fynncloud:themeChange':
                if (data.payload?.theme) {
                    this.context.theme = data.payload.theme;
                    if (data.payload.primaryColor) {
                        this.context.primaryColor = data.payload.primaryColor;
                    }
                    this.applyTheme(this.context.theme);
                    this.emit('themeChange', data.payload);
                }
                break;

            case 'fynncloud:subrouteChange':
                if (typeof data.payload?.subroute === 'string') {
                    this.context.subroute = data.payload.subroute;
                    this.emit('subrouteChange', data.payload);
                }
                break;

            case 'fynncloud:localeChange':
                if (typeof data.payload?.locale === 'string') {
                    this.context.locale = data.payload.locale;
                    this.emit('localeChange', data.payload);
                }
                break;

            case 'fynncloud:sidebarModeChange':
                if (data.payload?.sidebarMode === 'rail' || data.payload?.sidebarMode === 'integrated') {
                    this.context.sidebarMode = data.payload.sidebarMode;
                    this.emit('sidebarModeChange', data.payload);
                }
                break;

            case 'fynncloud:sidebarAction':
                this.emit('sidebarAction', data.payload);
                break;

            case 'fynncloud:sessionAction':
                this.emit('sessionAction', data.payload);
                break;

            case 'fynncloud:notificationAction':
                this.emit('notificationAction', data.payload);
                break;

            case 'fynncloud:presenceUpdated': {
                const currentUser = this.context.user;
                if (data.payload?.userId && currentUser && currentUser.id === data.payload.userId) {
                    this.context.user = {
                        ...currentUser,
                        status: data.payload.status,
                        presenceMode: data.payload.presenceMode,
                        statusMessage: data.payload.statusMessage ?? null,
                        activity: data.payload.activity ?? null,
                        activityLabel: data.payload.activityLabel ?? null
                    };
                }
                this.emit('presenceUpdated', data.payload);
                break;
            }

            case 'fynncloud:lifecycle':
                if (typeof data.payload?.realtimeStream === 'boolean') {
                    this.context.realtimeStream = data.payload.realtimeStream;
                }
                if (typeof data.payload?.hidden === 'boolean') {
                    this.context.hostHidden = data.payload.hidden;
                }
                this.emit('lifecycle', {
                    realtimeStream: this.context.realtimeStream ?? true,
                    hidden: this.context.hostHidden ?? false
                });
                break;

            case 'fynncloud:realtime':
                if (typeof data.payload?.event === 'string') {
                    this.emit('realtime', { event: data.payload.event, data: data.payload.data ?? null });
                }
                break;

            case 'fynncloud:realtimeReady':
                this.emit('realtimeReady', {});
                break;
        }
    }

    private postMessage(msg: Record<string, unknown>): void {
        if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
            window.parent.postMessage(msg, '*');
        }
    }

    private callRPC<T = any>(type: string, payload: unknown = null, timeoutMs = 10000): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const requestId = 'req_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
            const timer =
                timeoutMs > 0
                    ? setTimeout(() => {
                          if (this.pendingRequests.has(requestId)) {
                              this.pendingRequests.delete(requestId);
                              reject(new Error(`FynnCloud Bridge RPC '${type}' timed out after ${Math.round(timeoutMs / 1000)}s`));
                          }
                      }, timeoutMs)
                    : null;

            this.pendingRequests.set(requestId, { resolve, reject, timer });
            this.postMessage({ type, requestId, payload });
        });
    }

    private applyTheme(theme: BridgeTheme): void {
        if (typeof document === 'undefined') return;
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
        } else {
            document.documentElement.classList.add('light');
            document.documentElement.classList.remove('dark');
        }
    }

    private emit(eventName: string, data: unknown): void {
        const handlers = this.listeners.get(eventName) || [];
        for (const fn of handlers) {
            try {
                fn(data);
            } catch (err) {
                console.error(`[AppBridge] Listener error for event '${eventName}':`, err);
            }
        }
    }

    on<T = any>(eventName: string, handler: BridgeEventHandler<T>): UnsubscribeFn {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }
        this.listeners.get(eventName)!.push(handler);
        return () => {
            const list = this.listeners.get(eventName) || [];
            this.listeners.set(
                eventName,
                list.filter((fn) => fn !== handler)
            );
        };
    }

    /**
     * Receives real-time events your backend published for the current user via
     * `POST /api/apps/realtime/publish` (requires the `realtime:push` permission). They arrive over the
     * host's single event stream, so the app needs no SSE/WebSocket connection of its own while
     * `context.hostRealtime` is true. Delivery is best-effort: resynchronise in `onRealtimeReady`.
     */
    onRealtime<T = any>(handler: (event: string, data: T) => void): UnsubscribeFn {
        return this.on<BridgeRealtimeEvent<T>>('realtime', (payload) => handler(payload.event, payload.data));
    }

    /**
     * Fires whenever the host event stream (re)connects. Events published while it was disconnected are
     * not replayed, so fetch whatever you may have missed from your backend here.
     */
    onRealtimeReady(handler: () => void): UnsubscribeFn {
        return this.on('realtimeReady', () => handler());
    }

    /**
     * `fetch` that authenticates with the current app token and retries once on HTTP 401
     * after requesting a refreshed token from the host.
     *
     * Apps run in a sandboxed iframe with an opaque origin: the browser sends neither the user's session
     * cookie nor any other credential on its own, and the FynnCloud gateway requires one for everything
     * under `/api/**` of your app. Relative URLs resolve against the app's proxy path, so
     * `fynncloud.fetch('/api/status')` reaches your own backend; absolute URLs (e.g. the FynnCloud API
     * at `context.apiBase`) work too.
     */
    async fetch(input: string | URL, init: RequestInit = {}): Promise<Response> {
        const callerProvidedAuth = new Headers(init.headers).has('Authorization');
        let token = this.context.token;
        if (!token && !callerProvidedAuth) {
            token = (await this.getToken()).token;
            if (token) this.context.token = token;
        }

        const headers = new Headers(init.headers);
        if (token && !callerProvidedAuth) {
            headers.set('Authorization', `Bearer ${token}`);
        }

        const resolvedUrl = this.resolveUrl(input);
        const res = await window.fetch(resolvedUrl, { ...init, headers });

        const canRetryBody = typeof ReadableStream === 'undefined' || !(init.body instanceof ReadableStream);
        if (res.status === 401 && !callerProvidedAuth && canRetryBody) {
            try {
                const refreshed = await this.getToken(true);
                if (refreshed?.token && refreshed.token !== token) {
                    this.context.token = refreshed.token;
                    const retryHeaders = new Headers(init.headers);
                    retryHeaders.set('Authorization', `Bearer ${refreshed.token}`);
                    return window.fetch(resolvedUrl, { ...init, headers: retryHeaders });
                }
            } catch {
                // Return original 401 response if token refresh fails
            }
        }

        return res;
    }

    /** Maps a root-relative path (`/api/x`) onto this app's proxy prefix so it hits your own backend. */
    private resolveUrl(input: string | URL): string | URL {
        if (typeof input !== 'string' || !input.startsWith('/') || input.startsWith('//')) return input;
        if (input.startsWith('/api/apps/') || input.startsWith('/api/presence') || input === '/api/user/status') {
            return this.context.apiBase ? `${this.context.apiBase.replace(/\/$/, '')}${input}` : input;
        }
        const match = window.location.pathname.match(/^(.*?\/api\/apps\/[^/]+\/proxy)(?:\/|$)/);
        return match ? `${match[1]}${input}` : input;
    }

    /** Calls another FynnCloud app's backend through the compatibility-gated cross-app proxy. */
    fetchApp(targetAppId: string, path: string, init: RequestInit = {}): Promise<Response> {
        const cleanId = encodeURIComponent(targetAppId.trim());
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return this.fetch(`/api/apps/${cleanId}/proxy${cleanPath}`, init);
    }

    /** Returns resolved integration status for a target app declared in `compatibility.apps`. */
    getIntegration(targetAppId: string): BridgeAppIntegration | null {
        return (this.context.integrations || []).find((entry) => entry.id === targetAppId) ?? null;
    }

    /** Returns live presence & activity for the requested users (or all active users if omitted). */
    getPresence(userIds?: string[]): Promise<{ users: BridgePresenceEntry[] }> {
        return this.callRPC('fynncloud:getPresence', userIds ? { userIds } : null);
    }

    /** Updates the signed-in user's FynnCloud Core status / custom message via the host session. */
    setStatus(input: {
        presenceMode?: BridgePresenceMode;
        statusMessage?: string | null;
        clearStatusMessage?: boolean;
        expiresInMinutes?: number;
    }): Promise<BridgePresenceEntry> {
        return this.callRPC('fynncloud:setStatus', input);
    }

    ping(): Promise<{ pong: boolean; timestamp: number; version?: string }> {
        return this.callRPC('fynncloud:ping');
    }

    getTheme(): Promise<{ theme: BridgeTheme; primaryColor: string }> {
        return this.callRPC('fynncloud:getTheme');
    }

    getToken(forceRefresh = false): Promise<{ token: string | null }> {
        return this.callRPC('fynncloud:getToken', forceRefresh ? { forceRefresh: true } : null);
    }

    getFileAction(): Promise<any> {
        return this.callRPC('fynncloud:getFileAction');
    }

    showToast(message: string, type: BridgeToastType = 'info', duration = 3000): Promise<{ success: boolean }> {
        return this.callRPC('fynncloud:showToast', { message, type, duration });
    }

    navigate(path: string, options: boolean | BridgeNavigateOptions = false): Promise<{ success: boolean }> {
        const opts: BridgeNavigateOptions =
            typeof options === 'boolean' ? { external: options } : options || {};
        return this.callRPC('fynncloud:navigate', {
            path,
            external: Boolean(opts.external),
            replaceState: Boolean(opts.replaceState)
        });
    }

    close(): Promise<{ success: boolean }> {
        return this.callRPC('fynncloud:close');
    }

    setSidebar(items: any[]): Promise<{ success: boolean }> {
        return this.callRPC('fynncloud:setSidebar', { items });
    }

    setSidebarMode(mode: BridgeSidebarMode): Promise<{ success: boolean; sidebarMode: BridgeSidebarMode }> {
        return this.callRPC('fynncloud:setSidebarMode', { mode });
    }

    openFilePreview(fileId: string, fileName?: string, mimeType?: string): Promise<{ success: boolean }> {
        return this.callRPC('fynncloud:openFilePreview', { fileId, fileName, mimeType });
    }

    setBadge(badge: BridgeAppBadge | null): Promise<{ success: boolean }> {
        return this.callRPC('fynncloud:setBadge', badge);
    }

    setActiveSession(session: BridgeActiveSession | null): Promise<{ success: boolean }> {
        return this.callRPC('fynncloud:setActiveSession', session);
    }

    confirm(options: BridgeConfirmOptions): Promise<boolean> {
        return this.callRPC<{ confirmed: boolean }>(
            'fynncloud:confirm',
            options,
            INTERACTIVE_RPC_TIMEOUT_MS
        ).then((res) => Boolean(res?.confirmed));
    }

    pickFiles(options: BridgeFilePickerOptions = {}): Promise<BridgePickedFile[] | null> {
        return this.callRPC<{ files: BridgePickedFile[] | null }>(
            'fynncloud:pickFiles',
            options,
            INTERACTIVE_RPC_TIMEOUT_MS
        ).then((res) => res?.files ?? null);
    }

    notify(options: BridgeNotificationOptions): Promise<{ success: boolean }> {
        return this.callRPC('fynncloud:notify', options);
    }

    dismissNotification(id: string): Promise<{ success: boolean }> {
        return this.callRPC('fynncloud:dismissNotification', { id });
    }

    get storage(): StorageClient {
        return {
            get: (key) => this.callRPC('fynncloud:storage:get', { key }).then((res) => res?.value ?? null),
            set: (key, value) => this.callRPC('fynncloud:storage:set', { key, value }).then((res) => res?.success ?? true),
            delete: (key) => this.callRPC('fynncloud:storage:delete', { key }).then((res) => res?.success ?? true)
        };
    }
}

/** Shared instance. Call `fynncloud.init()` once your app has loaded. */
export const fynncloud = new FynnCloudBridge();

export default fynncloud;
