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

export interface BridgeUser {
    id: string;
    email: string;
    name?: string;
    role?: string;
}

export interface BridgeContext {
    appId: string | null;
    theme: BridgeTheme;
    primaryColor: string;
    locale: string;
    token: string | null;
    apiBase?: string | null;
    /** FynnCloud App API version of the host (not the FynnCloud product version). */
    apiVersion?: string | null;
    user: BridgeUser | null;
    fileAction: Record<string, any> | null;
    fileId: string | null;
    fileName: string | null;
}

export type BridgeToastType = 'info' | 'success' | 'warning' | 'error';

export interface StorageClient {
    get<T = any>(key: string): Promise<T | null>;
    set(key: string, value: any): Promise<boolean>;
    delete(key: string): Promise<boolean>;
}

export type BridgeEventHandler<T = any> = (data: T) => void;
export type UnsubscribeFn = () => void;

interface Pending {
    resolve: (value: any) => void;
    reject: (reason: Error) => void;
}

export class FynnCloudBridge {
    private pendingRequests = new Map<string, Pending>();
    private listeners = new Map<string, BridgeEventHandler[]>();

    context: BridgeContext = {
        appId: null,
        theme: 'dark',
        primaryColor: '#6366f1',
        locale: 'en',
        token: null,
        user: null,
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
        const data = event.data;
        if (!data || typeof data.type !== 'string') return;

        // Handle RPC responses
        if (data.requestId && this.pendingRequests.has(data.requestId)) {
            const { resolve, reject } = this.pendingRequests.get(data.requestId)!;
            this.pendingRequests.delete(data.requestId);
            if (data.error) {
                reject(new Error(data.error));
            } else {
                resolve(data.payload);
            }
            return;
        }

        // Handle Host Broadcasts
        switch (data.type) {
            case 'fynncloud:init':
                this.context = { ...this.context, ...(data.payload || {}) };
                this.applyTheme(this.context.theme);
                this.emit('init', this.context);
                break;

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
                    this.applyTheme(this.context.theme);
                    this.emit('themeChange', data.payload);
                }
                break;
        }
    }

    private postMessage(msg: Record<string, unknown>): void {
        if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
            window.parent.postMessage(msg, '*');
        }
    }

    private callRPC<T = any>(type: string, payload: unknown = null): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const requestId = 'req_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
            this.pendingRequests.set(requestId, { resolve, reject });
            this.postMessage({ type, requestId, payload });

            setTimeout(() => {
                if (this.pendingRequests.has(requestId)) {
                    this.pendingRequests.delete(requestId);
                    reject(new Error(`FynnCloud Bridge RPC '${type}' timed out after 10s`));
                }
            }, 10000);
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

    ping(): Promise<{ pong: boolean; timestamp: number; apiVersion?: string }> {
        return this.callRPC('fynncloud:ping');
    }

    getTheme(): Promise<{ theme: BridgeTheme; primaryColor: string }> {
        return this.callRPC('fynncloud:getTheme');
    }

    getToken(): Promise<{ token: string | null }> {
        return this.callRPC('fynncloud:getToken');
    }

    getFileAction(): Promise<any> {
        return this.callRPC('fynncloud:getFileAction');
    }

    showToast(message: string, type: BridgeToastType = 'info', duration = 3000): Promise<{ success: boolean }> {
        return this.callRPC('fynncloud:showToast', { message, type, duration });
    }

    navigate(path: string, external = false): Promise<{ success: boolean }> {
        return this.callRPC('fynncloud:navigate', { path, external });
    }

    close(): Promise<{ success: boolean }> {
        return this.callRPC('fynncloud:close');
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
