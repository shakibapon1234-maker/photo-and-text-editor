// sw.js — Photo Editor অফলাইন/PWA সাপোর্ট
// কনভেনশন: pure/helper ফাংশনগুলো top-level এ (Node দিয়ে syntax-check করা যায়),
// সব async কাজ defensive try/catch দিয়ে ঘেরা, যাতে একটা রিসোর্স ফেইল করলে পুরো SW ভেঙে না পড়ে।

const CACHE_VERSION = 'v1';
const APP_SHELL_CACHE = `photo-editor-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `photo-editor-runtime-${CACHE_VERSION}`;
const KNOWN_CACHES = [APP_SHELL_CACHE, RUNTIME_CACHE];

// sw.js যেখানেই ডিপ্লয় হোক (রুট বা সাব-ফোল্ডার), scope-রিলেটিভ পাথ থেকেই
// অ্যাবসোলিউট URL বানানো হচ্ছে যাতে সাবফোল্ডার ডিপ্লয়মেন্টেও ঠিকমতো কাজ করে।
const APP_SHELL_PATHS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './bulk.js',
    './social-presets.js',
    './watermark.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-512-maskable.png',
    './icons/apple-touch-icon.png'
];

// রানটাইমে সুযোগ পেলে ক্যাশ করা হবে এমন ট্রাস্টেড ক্রস-অরিজিন হোস্ট
// (Google Fonts + JSZip CDN) — AI API হোস্ট (remove.bg/deepai) ইচ্ছাকৃতভাবে বাদ,
// ওগুলো সবসময় লাইভ নেটওয়ার্ক দিয়েই যাওয়া উচিত, কখনো ক্যাশড রেসপন্স না।
const RUNTIME_CACHE_HOSTS = new Set([
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdnjs.cloudflare.com'
]);

function resolveAppShellUrls() {
    return APP_SHELL_PATHS.map((p) => new URL(p, self.registration.scope).toString());
}

// ---- install: app shell ক্যাশ করা (defensive — addAll ফেইল করলে one-by-one ফলব্যাক) ----
self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(APP_SHELL_CACHE);
            const urls = resolveAppShellUrls();
            try {
                await cache.addAll(urls);
            } catch (err) {
                // একটা অ্যাসেট (যেমন কোনো আইকন) ফেইল করলেও বাকিগুলো যেন ক্যাশ হয়ে যায়
                await Promise.allSettled(
                    urls.map(async (url) => {
                        try {
                            const res = await fetch(url, { cache: 'reload' });
                            if (res && res.ok) {
                                await cache.put(url, res);
                            }
                        } catch (innerErr) {
                            // নেটওয়ার্ক না থাকলে/ফাইল না পাওয়া গেলে চুপচাপ স্কিপ
                        }
                    })
                );
            }
            // এখানে ইচ্ছাকৃতভাবে self.skipWaiting() কল করা হচ্ছে না —
            // ব্যবহারকারী চললে হঠাৎ কন্ট্রোলার বদলে গিয়ে ইন-প্রোগ্রেস এডিট নষ্ট না হয়,
            // পেজ-সাইড কোড 'SKIP_WAITING' মেসেজ পাঠালে তবেই নতুন ভার্সন অ্যাক্টিভেট হবে (নিচে দেখুন)।
        })()
    );
});

// ---- activate: পুরনো ভার্সনের ক্যাশ ক্লিনআপ ----
self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const names = await caches.keys();
            await Promise.all(
                names
                    .filter((name) => name.startsWith('photo-editor-') && !KNOWN_CACHES.includes(name))
                    .map((name) => caches.delete(name))
            );
            await self.clients.claim();
        })()
    );
});

// পেজ থেকে নতুন ভার্সন অ্যাক্টিভেট করার অনুরোধ এলে
self.addEventListener('message', (event) => {
    if (event && event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// ---- fetch strategies ----

async function networkFirst(request, cacheName) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone()).catch(() => {});
        }
        return networkResponse;
    } catch (err) {
        const cached = await caches.match(request, { ignoreSearch: true });
        if (cached) return cached;
        throw err;
    }
}

async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    const networkFetch = fetch(request)
        .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
                cache.put(request, networkResponse.clone()).catch(() => {});
            }
            return networkResponse;
        })
        .catch(() => null);

    if (cached) {
        // ব্যাকগ্রাউন্ডে আপডেট চালিয়ে যাওয়া হচ্ছে, কিন্তু ইউজারকে সাথে সাথে cached ভার্সন দেওয়া হচ্ছে
        event_waitUntilSafe(networkFetch);
        return cached;
    }
    const networkResponse = await networkFetch;
    if (networkResponse) return networkResponse;
    throw new Error('অফলাইন এবং ক্যাশেও পাওয়া যায়নি: ' + request.url);
}

// staleWhileRevalidate-এর ব্যাকগ্রাউন্ড fetch-টা যেন সার্ভিস ওয়ার্কার সময়ের আগে বন্ধ না হয়ে যায়,
// কিন্তু এখানে সরাসরি event.waitUntil অ্যাক্সেস নেই (helper function-এ কল হচ্ছে) — তাই promise-টা
// নিজে থেকেই resolve হতে দেওয়া হচ্ছে (fire-and-forget), কোনো throw যাতে unhandled না থাকে সেটা catch করা আছে।
function event_waitUntilSafe(promise) {
    if (promise && typeof promise.catch === 'function') {
        promise.catch(() => {});
    }
}

self.addEventListener('fetch', (event) => {
    const { request } = event;

    // শুধু GET রিকোয়েস্ট হ্যান্ডেল করা হবে — POST (remove.bg/deepai আপলোড ইত্যাদি) সবসময় সরাসরি নেটওয়ার্কে যাবে
    if (request.method !== 'GET') return;

    let url;
    try {
        url = new URL(request.url);
    } catch (err) {
        return; // অস্বাভাবিক URL হলে ইন্টারসেপ্ট না করে ব্রাউজারের ডিফল্ট আচরণে ছেড়ে দেওয়া
    }

    // Navigation (HTML পেজ লোড) — network-first, অফলাইনে ক্যাশড app-shell fallback
    if (request.mode === 'navigate') {
        event.respondWith(
            networkFirst(request, APP_SHELL_CACHE).catch(async () => {
                const shellUrl = new URL('./index.html', self.registration.scope).toString();
                const cached = await caches.match(shellUrl);
                return cached || new Response('অফলাইন — ইন্টারনেট সংযোগ পরীক্ষা করুন।', {
                    status: 503,
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                });
            })
        );
        return;
    }

    const isSameOrigin = url.origin === self.location.origin;

    if (isSameOrigin) {
        // এই অ্যাপের নিজের ফাইল (js/css/আইকন) — stale-while-revalidate, অফলাইনেও কাজ করবে
        event.respondWith(staleWhileRevalidate(request, APP_SHELL_CACHE));
        return;
    }

    if (RUNTIME_CACHE_HOSTS.has(url.hostname)) {
        // ফন্ট/JSZip CDN — প্রথমবার অনলাইনে থাকলে ক্যাশ হয়ে যাবে, পরে অফলাইনেও পাওয়া যাবে
        event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
        return;
    }

    // বাকি সব (AI API কল, output_url থেকে ছবি fetch, ইত্যাদি) — ইচ্ছাকৃতভাবে ইন্টারসেপ্ট করা হচ্ছে না,
    // ব্রাউজারের স্বাভাবিক নেটওয়ার্ক ফ্লো-তেই যাবে।
});
