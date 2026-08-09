# প্রজেক্ট প্ল্যান ২: থ্রিডি টেক্সট / শেপ মডিউল

**স্ট্যাটাস:** Phase 4 (Export Pipeline) সম্পূর্ণ কোড + real headless-Chromium টেস্ট, শুধু আপনার ভিডিও এডিটরে ম্যানুয়াল import টেস্ট বাকি। Phase 5 (Optimization)-এর Quality preset (Low/Medium/High) অংশ এই সেশনে যোগ হয়েছে ও ভেরিফাই হয়েছে (npm build + DOM-id cross-check + আসল TextGeometry দিয়ে ট্রায়াঙ্গেল-কাউন্ট টেস্ট) — কিন্তু এই সেশনে headless-Chromium ডাউনলোড করা যায়নি, তাই আসল ব্রাউজার রেন্ডার/লো-এন্ড FPS টেস্ট এখনো বাকি।
**প্রায়োরিটি:** দ্বিতীয় ধাপ
**সম্পর্কিত প্রজেক্ট:** ফটো এডিটর (PLAN_1) এবং আপনার বিদ্যমান **Studio Flow Video Editor** — দুটোতেই ব্যবহারযোগ্য হবে এভাবে বানানো হবে

---

## ১. লক্ষ্য (Goal)

একটা **স্বতন্ত্র (standalone) 3D টেক্সট/শেপ মডিউল** — যেটা:
- টেক্সট ও বেসিক শেপকে থ্রিডি ফর্মে কাস্টমাইজ করা যাবে (depth, rotation, material, animation)
- Transparent background সহ export করা যাবে (video বা image sequence হিসেবে)
- ফটো এডিটর অ্যাপ এবং বিদ্যমান ভিডিও এডিটর — দুটোতেই আলাদা কোড না লিখে একই আউটপুট ব্যবহার করা যাবে

> ⚠️ গুরুত্বপূর্ণ সিদ্ধান্ত: আপনার ভিডিও এডিটর এখন স্টেবল, ওখানে সরাসরি কোনো নতুন কোড টাচ করা হবে **না**। এই মডিউল সম্পূর্ণ আলাদা কোডবেসে বানিয়ে শুধু export ফাইল (video/PNG sequence) হিসেবে ভিডিও এডিটরে import করা হবে — তাই এক্সিস্টিং প্রজেক্টে error হওয়ার ঝুঁকি নেই।

---

## ২. টেক স্ট্যাক (প্রস্তাবিত)

| লেয়ার | টেকনোলজি |
|---|---|
| 3D রেন্ডারিং ইঞ্জিন | **Three.js** (WebGL) |
| টেক্সট জিওমেট্রি | `TextGeometry` (extrude) বা `troika-three-text` (উন্নত টেক্সট রেন্ডারিং) |
| ফন্ট লোডিং | Three.js Font Loader (TTF → JSON কনভার্ট) |
| Animation | Three.js Animation Mixer / GSAP (টাইমলাইন কন্ট্রোলের জন্য) |
| Export (Video) | `MediaRecorder API` অথবা `ccapture.js` → WebM (alpha channel সহ) |
| Export (Image sequence) | Canvas frame capture → PNG sequence (ZIP এ প্যাক করে) |
| UI (কাস্টমাইজেশন প্যানেল) | HTML/CSS/JS — ফটো এডিটরের মতোই স্ট্যাক |

---

## ৩. পারফরম্যান্স ও কমপ্লেক্সিটি — লেভেল ভিত্তিক

| লেভেল | কাজ | আনুমানিক সময় |
|---|---|---|
| **Level 1 — Basic** | টেক্সট extrude, rotate/tilt, বেসিক color/material, বেসিক lighting | ২-৩ সপ্তাহ |
| **Level 2 — Polish** | Metallic/glass/neon material, camera movement, shadow | ৩-৪ সপ্তাহ |
| **Level 3 — Animation** | Preset animations (bounce, rotate-in, fade, spin) | ২-৩ সপ্তাহ |
| **Level 4 — Export Pipeline** | Transparent video/PNG sequence export, ভিডিও এডিটরে ইম্পোর্ট টেস্ট | ২ সপ্তাহ |
| **Level 5 — Mobile Optimization** | পিসি কনফিগ কম হলে/মোবাইলে পারফরম্যান্স টিউনিং (polygon count কমানো, LOD) | ২ সপ্তাহ |

> নোট: আপনি PC কনফিগারেশনের কথা বলেছিলেন — তাই **Level 5 (Mobile/Low-config Optimization)** একটা আলাদা ধাপ হিসেবে রাখা হলো, যাতে শুরুতে ভারী ফিচার নিয়ে আটকে না যান।

---

## ৪. ফেজ ভিত্তিক প্ল্যান

### Phase 1 — Core 3D Text Engine
- [x] Three.js সেটআপ (scene, camera, renderer, basic 3-point lighting: key/rim/fill)
- [x] টেক্সট ইনপুট → 3D extruded টেক্সট রেন্ডার (`TextGeometry`, bevel সহ, debounced live update)
- [x] Rotate/tilt কন্ট্রোল (X/Y/Z axis স্লাইডার) + বোনাস হিসেবে ফ্রি ক্যামেরা অরবিট (`OrbitControls`, drag/scroll) ও auto-rotate টগল
- [x] বেসিক কালার/ম্যাটেরিয়াল সিলেক্টর (Matte/Glossy/Flat — মেটালিক/গ্লাস/নিয়ন Phase 2-এ)
- [x] বোনাস: Depth ও Size স্লাইডার (Goal সেকশনে উল্লেখ করা "depth" কাস্টমাইজেশনের জন্য)
- [x] Renderer transparent background (`alpha: true`) সেট করা হয়েছে, যাতে Phase 4-এ export pipeline-এর জন্য renderer পাল্টাতে না হয়

**কোড stack:** Three.js (ES modules, CDN importmap দিয়ে — কোনো npm install/build স্টেপ লাগে না), ফটো এডিটরের সাথে একই ভিজ্যুয়াল ভাষা (color tokens, ফন্ট) reuse করা হয়েছে আর্কিটেকচারাল কনসিস্টেন্সির জন্য।

**sandbox-এ যা টেস্ট করা গেছে (Playwright + headless Chromium দিয়ে, সত্যিকারের ব্রাউজার):**
- লোকাল HTTP সার্ভারে সার্ভ করে হেডলেস ক্রোমিয়ামে লোড করা হয়েছে — `index.html` + `style.css` ঠিকমতো রেন্ডার হয় (টপবার, সবগুলো প্যানেল সেকশন, স্লাইডার, কালার পিকার, বাংলা লেবেল — স্ক্রিনশট কনফার্মড)।
- `main.js`-এ কোনো syntax error নেই (`node --check` পাস, এবং ES module হিসেবে execute শুরুও করেছে — শুধু `three` import-এর নেটওয়ার্ক fetch-এ গিয়ে থেমেছে, কোনো কোড এরর না)।

**যা টেস্ট করা যায়নি (sandbox-এ ইন্টারনেট নেই — `npm ping`/`curl unpkg.com` দুটোই 403):**
- আসল `three`/`OrbitControls`/`TextGeometry`/`FontLoader` CDN থেকে লোড করে real 3D টেক্সট রেন্ডার
- Extrude/bevel-এর ভিজ্যুয়াল কারেক্টনেস, লাইটিং, তিনটা ম্যাটেরিয়াল প্রিসেট চোখে দেখে ভেরিফাই
- মাউস দিয়ে drag-orbit / scroll-zoom (OrbitControls) আসলে কাজ করে কিনা

**Milestone:** ইউজার টেক্সট লিখে থ্রিডি আকারে দেখতে পারছে, ঘোরাতে পারছে *(কোড + UI রেন্ডার sandbox-এ ভেরিফাইড; আসল 3D রেন্ডার ও ইন্টারঅ্যাকশন আপনার ইন্টারনেট-সহ মেশিনে টেস্ট করা বাকি — একটা লোকাল HTTP সার্ভার দিয়ে খুলতে হবে, `file://` দিয়ে না, README দেখুন)*

### Phase 2 — Material & Visual Polish
- [x] প্রিসেট ম্যাটেরিয়াল (matte, glossy, metallic, glass, neon — ৫টা বাটন-গ্রিড হিসেবে, Phase 1-এর ৩-অপশন ড্রপডাউন রিপ্লেস করেছে)
- [x] লাইটিং প্রিসেট (studio, dramatic, soft) — প্রতিটা প্রিসেট নিজের লাইট-রিগ বানায়/ভাঙে, প্রিসেট পাল্টালে পুরনো লাইট রয়ে যাওয়ার বাগ নেই
- [x] শ্যাডো/রিফ্লেকশন অপশনাল টগল — শ্যাডোর জন্য গ্রাউন্ড শ্যাডো-ক্যাচার প্লেন, রিফ্লেকশনের জন্য procedural environment map (`RoomEnvironment` + `PMREMGenerator`, কোনো HDRI ডাউনলোড লাগে না)
- [x] বোনাস: Neon প্রিসেটের জন্য আলাদা "Glow তীব্রতা" স্লাইডার (শুধু Neon সিলেক্ট করলে দেখা যায়)

**গুরুত্বপূর্ণ পরিবর্তন — বিল্ড সিস্টেম:** Phase 1-এ CDN importmap ব্যবহার হচ্ছিল, যেটা এই sandbox-এর network allowlist-এ ব্লকড (`unpkg.com` → 403, `curl` দিয়ে কনফার্ম করা হয়েছে)। Phase 2 শুরুর আগে এই ওপেন-ডিসিশনটা রেজলভ করা হয়েছে (§৬-এ উল্লেখ ছিল) — এখন npm dependency + esbuild bundle (PLAN_1-এর মতোই প্যাটার্ন), কারণ npm registry sandbox-এ অ্যাক্সেসযোগ্য। ফন্টও এখন JSON module হিসেবে সরাসরি বান্ডলে ইম্পোর্ট হয় (`FontLoader.parse()` দিয়ে সিঙ্ক্রোনাসলি) — কোনো নেটওয়ার্ক ফেচ লাগে না ফন্টের জন্যও।

**sandbox-এ যা আসলেই টেস্ট করা গেছে (Playwright + headless Chromium, real `three` বিল্ড দিয়ে — Phase 1-এর মতো শুধু syntax-check না):**
- `npm install` (৩টা প্যাকেজ) ও `npm run build` সত্যিই চালানো হয়েছে, `www/main.bundle.js` জেনারেট হয়েছে।
- **আসল 3D extruded টেক্সট রেন্ডার হতে দেখা গেছে** — status note "রেডি" দেখাচ্ছে (Phase 1-এ যেখানে "ফন্ট লোড ব্যর্থ" দেখাত)।
- ৫টা ম্যাটেরিয়াল প্রিসেট ক্লিক করে স্ক্রিনশট নেওয়া হয়েছে — Matte/Glossy/Metallic/Neon স্পষ্ট আলাদা দেখা যায়, Metallic-এ এনভায়রনমেন্ট রিফ্লেকশন (উজ্জ্বল streak) স্পষ্ট।
- ৩টা লাইটিং প্রিসেট Glossy ম্যাটেরিয়ালে টেস্ট করে কনফার্ম করা হয়েছে যে ভিজ্যুয়ালি আলাদা: Studio ব্যালান্সড, Dramatic-এ হার্ড শ্যাডো/কন্ট্রাস্ট, Soft-এ ফ্ল্যাট/ইভেন লাইটিং।
- রিফ্লেকশন টগল বন্ধ করে Metallic-এ টেস্ট করা হয়েছে — অবজেক্ট প্রায় কালো হয়ে যায় (শুধু ডাইরেক্ট স্পেকুলার থাকে), মানে টগলটা আসলেই কাজ করে।
- টেক্সট বদলে লাইভ রিবিল্ড, এবং মাউস ড্র্যাগ করে ক্যামেরা অরবিট — দুটোই সত্যিই কাজ করে কনফার্ম করা হয়েছে।

**২টা রিয়েল বাগ ধরা পড়েছে ও ফিক্স হয়েছে এই টেস্টিং-এ:**
1. CSS বাগ: `.field { display: flex }` ব্রাউজারের ডিফল্ট `[hidden]` বিহেভিয়ার override করছিল, ফলে Neon-only "Glow তীব্রতা" স্লাইডার সব ম্যাটেরিয়ালেই দেখা যাচ্ছিল। `.field[hidden] { display: none }` যোগ করে ফিক্স করা হয়েছে।
2. Glass ম্যাটেরিয়াল বাগ: প্রথম ভার্সনে `transmission: 1.0` ব্যবহার হয়েছিল, কিন্তু scene transparent (alpha:true) হওয়ায় রিফ্র্যাক্ট করার মতো কিছুই ছিল না পেছনে — ফলে Glass দেখতে হুবহু Glossy-র মতোই লাগছিল (স্ক্রিনশট ডিফ করে কনফার্ম করা হয়েছে, mean pixel diff মাত্র ~১০/২৫৫)। কম `transmission` (0.35) + আসল `opacity` (0.55) দিয়ে ফিক্স করা হয়েছে, যেটা এখন যেকোনো ব্যাকগ্রাউন্ডেই ঠিকমতো glass-এর মতো দেখায়।

**এখনো sandbox-এ ভেরিফাই করা যায়নি:** আসল GPU-তে ভিজ্যুয়াল কোয়ালিটি (এই টেস্ট SwiftShader সফটওয়্যার রেন্ডারার দিয়ে হয়েছে), গ্রাউন্ড-প্লেন শ্যাডো চোখে দেখে কনফার্ম করা (ডিফল্ট ক্যামেরা অ্যাঙ্গেলে ফ্রেমের বাইরে), এবং লো-এন্ড ডিভাইসে পারফরম্যান্স (এটা ইচ্ছাকৃতভাবে Phase 5-এর স্কোপ)।

**Milestone:** ভিজ্যুয়ালি প্রেজেন্টেবল, প্রফেশনাল লুকিং থ্রিডি টেক্সট *(কোড + বিল্ড + সব প্রিসেট sandbox-এ headless ব্রাউজারে রিয়েল-টেস্টেড; শুধু রিয়েল GPU/ডিভাইস ভিজ্যুয়াল কনফার্মেশন আপনার মেশিনে বাকি)*

### Phase 3 — Animation System
- [x] প্রিসেট অ্যানিমেশন লাইব্রেরি (৯টা: None + Fade In, Pop In, Rotate In, Flip In, Slide In বাম/ডান, Drop In, Wobble) — `src/animations.js`-এ pure function হিসেবে, কোনো `three` ইম্পোর্ট ছাড়াই
- [x] Timeline কন্ট্রোল — Duration (0.2s–4s), Delay (0–3s), Easing dropdown (Linear/Ease In/Ease Out/Ease In-Out/Elastic-Out/Bounce-Out), Loop টগল
- [x] প্রিভিউ প্লেব্যাক — Play/Restart + Stop বাটন, লাইভ প্রোগ্রেস বার, স্ট্যাটাস লেবেল (delay/playing/looping/done/stopped)
- [x] প্রতিটা প্রিসেট Rotate/Tilt প্যানেলের বর্তমান X/Y/Z স্লাইডারের উপর একটা "অফসেট" হিসেবে কাজ করে — তাই Play চাপার আগে যেভাবে ঘুরিয়ে রাখা হয়, অ্যানিমেশন শেষে ঠিক সেখানেই ল্যান্ড করে

**এই সেশনে যা টেস্ট করা গেছে (network ছাড়া যা সম্ভব):**
- `node --check` দিয়ে `src/animations.js` ও `src/main.js` — সিনট্যাক্স ভ্যালিড
- `main.js`-এর সব `getElementById` কল `index.html`-এর `id`-এর সাথে প্রোগ্রাম্যাটিক্যালি ক্রস-চেক করা হয়েছে (৩৫টা, সবগুলো ম্যাচ করেছে)
- `animations.js`-এ কোনো `three` ডিপেন্ডেন্সি নেই বলে সেটাকে সরাসরি প্লেইন Node দিয়ে execute করে টেস্ট করা গেছে: ৯টা প্রিসেটের `apply(1)`-ই নিউট্রাল অফসেটে (pos/rot শূন্য, scale/opacity ১) রিজলভ করে কনফার্মড — এটাই গ্যারান্টি দেয় যে অ্যানিমেশন শেষে মেশ সবসময় ঠিক Text/Rotate প্যানেলের স্লাইডার-অনুযায়ী পোজেই ফিরে আসবে। ইজিং ফাংশনগুলোর f(0)/f(0.5)/f(1)-ও নিউমেরিক্যালি চেক করা হয়েছে।

**যা টেস্ট করা যায়নি এই সেশনে:** আসল রেন্ডার (কোনো এফেক্ট আসলে কেমন দেখায়), animation চলাকালীন material/lighting/rotation স্লাইডার বদলালে আচরণ, Glass ম্যাটেরিয়ালের সাথে opacity-toggle-এর কোনো z-fighting/sorting আর্টিফ্যাক্ট হয় কিনা — এগুলোর জন্য `npm install && npm run build`-এর পর আপনার মেশিনে ব্রাউজারে খুলে দেখতে হবে (README-তে বিস্তারিত)।

**Milestone:** টেক্সট অ্যানিমেটেড অবস্থায় প্রিভিউ করা যাচ্ছে *(কোড + প্রিসেট-গণিত ইউনিট-টেস্টেড; আসল ব্রাউজার রেন্ডার আপনার মেশিনে ভেরিফাই বাকি — এই সেশনে npm registry অ্যাক্সেস ছিল না)*

### Phase 4 — Export Pipeline (সবচেয়ে গুরুত্বপূর্ণ ধাপ)
- [x] Transparent WebM export — real browser টেস্টে VP9 স্ট্রিমে `alpha_mode: 1` কনফার্মড (`ffprobe` দিয়ে), কিন্তু ভিডিও এডিটরে import করলে alpha survive করে কিনা সেটা এখনো ভেরিফাই বাকি (নিচে দেখুন)
- [x] PNG sequence export (fallback অপশন) — real ZIP ডাউনলোড করে pixel-level alpha (0=transparent, 255=opaque) কনফার্মড
- [ ] আপনার ভিডিও এডিটরে ম্যানুয়াল import টেস্ট (compatibility ভেরিফাই) — এটা sandbox-এ করা সম্ভব না, এটাই এখন একমাত্র বাকি Phase 4 আইটেম

**Milestone:** এক্সপোর্ট করা ফাইল ভিডিও এডিটরে সরাসরি বসানো যাচ্ছে, ব্যাকগ্রাউন্ড ট্রান্সপারেন্ট থাকছে *(এক্সপোর্ট পাইপলাইন কোড + real headless-Chromium টেস্ট সম্পূর্ণ; ভিডিও এডিটরে ম্যানুয়াল import টেস্ট বাকি — README.md-এর "Next" সেকশন দেখুন)*

### Phase 5 — Optimization
- [x] Quality preset (Low/Medium/High) — নতুন "কোয়ালিটি (পারফরম্যান্স)" প্যানেল সেকশন, materialPresetGrid-এর মতোই preset-button প্যাটার্নে। Medium = আগের Phase 1-4-এর হার্ডকোডেড ভ্যালুই হুবহু (curveSegments 6, bevelSegments 3, shadow map 1024px, pixel-ratio cap 2x) — তাই ডিফল্টে ভিজ্যুয়ালি কিছু পাল্টায়নি।
- [x] পলিগন কাউন্ট অপটিমাইজেশন — TextGeometry-র `curveSegments`/`bevelSegments` এখন কোয়ালিটি-নির্ভর (Low: 2/1, Medium: 6/3, High: 12/6)
- [x] শ্যাডো-ম্যাপ রেজোলিউশন কোয়ালিটি-নির্ভর (Low 512px, Medium 1024px, High 2048px) এবং pixel-ratio cap (Low 1x, Medium/High 2x)
- [ ] লো-এন্ড কনফিগে পারফরম্যান্স টেস্ট — **এখনো বাকি, sandbox-এ সম্ভব না** (নিচে দেখুন)

**এই সেশনে যা টেস্ট করা গেছে:**
- `npm install` + `npm run build` সত্যিই চালানো হয়েছে (esbuild bundle সফল, `node --check` দিয়ে সিনট্যাক্স ভ্যালিড)।
- নতুন ২টা DOM id (`qualityPresetGrid`, `qualityNote`) `index.html`-এর সাথে প্রোগ্রাম্যাটিক্যালি ক্রস-চেক করা হয়েছে — মোট ৫২টা `getElementById` কলই ম্যাচ করেছে (Phase 3-এর মতো একই মেথড)।
- **আসল `TextGeometry` (project-এর নিজস্ব three.js দিয়ে, plain Node-এ, কোনো DOM/WebGL ছাড়াই) বিল্ড করে ট্রায়াঙ্গেল কাউন্ট ভেরিফাই করা হয়েছে:** একই টেক্সট ("Hello Test") তিনটা কোয়ালিটি টিয়ারে — Low: 1,608 ট্রায়াঙ্গেল, Medium: 8,232, High: 27,528। অর্থাৎ Low↔High-এ প্রায় ১৭x পার্থক্য, রিয়েল জিওমেট্রি বিল্ড দিয়ে কনফার্মড, শুধু কনফিগ-সংখ্যা "যুক্তিসঙ্গত দেখাচ্ছে" তা না।
- এই সেশনে headless-Chromium (Playwright) ডাউনলোড করা যায়নি (`cdn.playwright.dev` network allowlist-এ নেই) — তাই Phase 1-4-এর মতো real browser screenshot/DOM-interaction টেস্ট এবার সম্ভব হয়নি। এটা sandbox সেশন-নির্ভর একটা লিমিটেশন (আগের সেশনগুলোতেও npm/network অ্যাক্সেস সেশন-ভেদে আলাদা ছিল), কোড ইস্যু না।

**যা এখনো বাকি (আপনার মেশিনে):**
- `npm install && npm run build && npm run serve` চালিয়ে ব্রাউজারে Low/Medium/High বাটন ক্লিক করে চোখে দেখা — geometry আসলেই স্মুথনেস কমছে/বাড়ছে কিনা, শ্যাডো এজ রেজোলিউশন পাল্টাচ্ছে কিনা
- আসল লো-এন্ড ডিভাইসে (বা Chrome DevTools CPU throttling দিয়ে) FPS তুলনা — Low vs High
- ঐচ্ছিক: টেক্সচার সাইজ অপটিমাইজেশন এখনো করা হয়নি (এই মডিউলে কোনো ইমেজ টেক্সচার নেই — শুধু vertex color/material — তাই আপাতত প্রযোজ্য না, `RoomEnvironment` procedural PMREM-ও ফিক্সড ছোট সাইজ)

**Milestone:** কোয়ালিটি প্রিসেট দিয়ে পারফরম্যান্স/ফিডেলিটি ট্রেড-অফ কন্ট্রোল করা যায় *(কোড + বিল্ড + DOM-id ক্রস-চেক + রিয়েল geometry ট্রায়াঙ্গেল-কাউন্ট sandbox-এ ভেরিফাইড; আসল ব্রাউজার রেন্ডার ও ডিভাইস FPS টেস্ট আপনার মেশিনে বাকি — এই সেশনে headless-Chromium sandbox-এ ডাউনলোড করা যায়নি)*

---

## ৫. ইন্টিগ্রেশন স্ট্র্যাটেজি (গুরুত্বপূর্ণ)

```
[3D Text Module - Standalone]
        │
        ├── Export as Transparent Video/PNG Sequence
        │
        ├──> [ফটো এডিটর অ্যাপ] (স্ট্যাটিক ইমেজ হিসেবে ব্যবহার)
        │
        └──> [Studio Flow Video Editor] (animated layer হিসেবে import,
              কোনো কোড টাচ না করেই)
```

এভাবে দুটো এক্সিস্টিং প্রজেক্টের কোনোটাতেই ডাইরেক্ট কোড পরিবর্তন লাগবে না — শুধু ফাইল ইম্পোর্ট।

---

## ৬. যা এখনো ঠিক করা হয়নি (Open Decisions)
- ~~Export format: WebM (alpha) নাকি PNG sequence — নাকি দুটোই রাখা হবে~~ → **রেজলভড, Phase 4-তে**: দুটোই রাখা হয়েছে — WebM প্রাইমারি (Chromium/VP9-only alpha), PNG Sequence ফলব্যাক (universal alpha support, কিন্তু এই sandbox-এ SwiftShader-এর কারণে ধীর — README.md দেখুন)
- অ্যানিমেশন প্রিসেট কয়টা/কোনগুলো লাগবে (লিস্ট বানাতে হবে)
- এই মডিউল কি ফটো এডিটরের ভিতরেই একটা ট্যাব হিসেবে থাকবে, নাকি একদম আলাদা টুল হিসেবে
- ~~Three.js CDN importmap নাকি npm+esbuild bundle~~ → **রেজলভড, Phase 2-তে**: npm+esbuild bundle-এ সুইচ করা হয়েছে (দেখুন Phase 2 নোট এবং README.md-এর "Build system" সেকশন)

---

## ৭. পরবর্তী সেশনে কন্টিনিউ করার জন্য
এই ফাইলটা (ও পুরো `3d-text-module/` ফোল্ডার) আপলোড করে বলবেন। এই সেশনে Phase 5-এর Quality preset অংশ যোগ হয়েছে (কোড + build + DOM-id cross-check + real TextGeometry triangle-count টেস্ট — বিস্তারিত উপরে Phase 5 সেকশনে)। পরবর্তী কাজ হতে পারে, প্রায়োরিটি অনুযায়ী:
1. **সবচেয়ে গুরুত্বপূর্ণ (Phase 4-এর বাকি অংশ, এখনো অসম্পূর্ণ):** নিজের মেশিনে `npm install && npm run build && npm run serve` চালিয়ে দুটো এক্সপোর্ট ফরম্যাটই আপনার Studio Flow Video Editor-এ import করে background transparent থাকছে কিনা দেখা — বিশেষ করে WebM-এর alpha_mode ফ্ল্যাগ, কারণ সব এডিটর এটা সাপোর্ট নাও করতে পারে।
2. নিজের মেশিনে ব্রাউজারে Low/Medium/High কোয়ালিটি বাটন ক্লিক করে চোখে দেখা এবং (Chrome DevTools CPU throttling দিয়ে) FPS তুলনা — এই সেশনে headless-Chromium sandbox-এ ডাউনলোড করা যায়নি বলে এটা বাকি।
3. কোনো বাগ/ফিডব্যাক পেলে "এই বাগ পেয়েছি" বলে বলবেন, অথবা
4. PLAN_1-এ ফিরে গিয়ে এই মডিউলকে ফটো এডিটরের বেসিক টেক্সট টুলের সাথে ইন্টিগ্রেট করা শুরু করা — "PLAN_1-এ ইন্টিগ্রেশন শুরু করি" বলে বলবেন।
