/**
 * Entry for the browser (IIFE) build, `dist/app-bridge.global.js`.
 * For apps without a bundler: load it with a <script> tag, then use `window.fynncloud`.
 */
import { fynncloud, FynnCloudBridge } from './index';

declare global {
    interface Window {
        fynncloud: FynnCloudBridge;
        FynnCloudBridge: typeof FynnCloudBridge;
    }
}

window.FynnCloudBridge = FynnCloudBridge;
window.fynncloud = fynncloud;
