# প্রজেক্ট প্ল্যান ৪: প্রেজেন্টেশন স্টুডিও (PowerPoint সেকশন) আপগ্রেড — 3D Text ইন্টিগ্রেশন + ফিচার এক্সপ্যানশন

**স্ট্যাটাস:** 🟢 §২ (3D Text native integration) সম্পূর্ণ — Step 1-8 সব কোড করা হয়েছে (সেশন ১: Step 1-5, সেশন ২: Step 6-8)। §৬-এর Speaker notes + Presenter view audit-ও সম্পূর্ণ (সেশন ৩)। এখন থেকে পরবর্তী কাজ §৮-এর প্রায়োরিটি #৩ (Alignment toolbar + Undo history UI)।
**সম্পর্কিত প্রজেক্ট:** `presentation-studio.html` + সংশ্লিষ্ট `presentation-*.js` ফাইলগুলো (বিদ্যমান PowerPoint-স্টাইল এডিটর), এবং `3d-text-module-phase5-quality/` (PLAN_2, স্বতন্ত্র 3D Text মডিউল)

---

## ১. লক্ষ্য (Goal)

দুইটা কাজ একসাথে করা:

1. **3D Text-কে standalone এক্সপোর্ট-ইমপোর্ট টুল থেকে বের করে প্রেজেন্টেশন স্টুডিওর একটা native, লাইভ element বানানো** — যাতে ইউজার স্লাইডে সরাসরি টাইপ করে 3D টেক্সট বসাতে পারে, আলাদা অ্যাপে গিয়ে ভিডিও এক্সপোর্ট-ইমপোর্ট করার দরকার না পড়ে।
2. **প্রেজেন্টেশন স্টুডিওকে সাধারণ ফিচার-সেটের বাইরে নিয়ে গিয়ে Microsoft PowerPoint-এর তুলনায় আরও আধুনিক ও দৃষ্টিনন্দন করা** — কাঠামো (structure), ডিজাইন, কনটেন্ট টুল, প্রেজেন্টিং এবং এক্সপোর্ট — এই পাঁচটা এরিয়াতে।

> ⚠️ গুরুত্বপূর্ণ সিদ্ধান্ত (PLAN_2-এর মতোই): স্টুডিও এখন স্টেবল এবং অনেকগুলো `presentation-*.js` ফাইল একসাথে কাজ করছে (autosave, undo, animations, exports ইত্যাদি জড়িয়ে আছে)। প্রতিটা নতুন ফিচার যতটা সম্ভব **নতুন, আলাদা ফাইলে** লেখা হবে (বিদ্যমান কনভেনশন অনুযায়ী — যেমন `presentation-3d-text-live.js`, `presentation-morph-transition.js`), যাতে বিদ্যমান ফিচারে regression risk কম থাকে।

---

## ২. আর্কিটেকচার সিদ্ধান্ত — 3D Text native integration (সবচেয়ে গুরুত্বপূর্ণ অংশ)

বর্তমানে দুইটা কোডবেস আলাদা:

```
[3D Text Module - Standalone, Three.js + WebGL]
        │
        └── এখন: Export as Transparent Video/PNG → ম্যানুয়ালি স্লাইডে ইমেজ/ভিডিও হিসেবে import

[Presentation Studio - DOM/CSS ভিত্তিক elements (text-el, image-el ইত্যাদি)]
```

**প্রস্তাবিত নতুন আর্কিটেকচার:**

```
[Presentation Studio]
        │
        ├── element type: "text-el"      (বিদ্যমান, DOM/CSS)
        ├── element type: "image-el"     (বিদ্যমান, DOM/CSS)
        └── element type: "text3d-el"    (🆕 নতুন — Three.js canvas overlay)
                 │
                 └── 3D Text মডিউলের core rendering কোড (geometry, material,
                     lighting, animation presets) reuse করে — কিন্তু standalone
                     UI/export pipeline-এর বদলে সরাসরি স্লাইডের ভেতরে বসে
```

**কেন এইভাবে (ও কী কী ট্রেড-অফ):**
- `text3d-el` একটা `<canvas>`-ভিত্তিক absolute-positioned element হবে, ঠিক `image-el`-এর মতোই move/resize/rotate হ্যান্ডেল থাকবে (বিদ্যমান `presentation-shape-transforms.js` এর প্যাটার্ন রিইউজ)
- প্রতিটা `text3d-el`-এর নিজস্ব ছোট Three.js scene/renderer থাকবে (বড় ডেকে অনেকগুলো একসাথে থাকলে পারফরম্যান্স ইস্যু হতে পারে — নিচে §২.১-এ)
- Export (PNG/PDF/pptx) করার সময় প্রতিটা 3D element-কে একটা static raster frame-এ বেক (bake) করে নিতে হবে — কারণ বেশিরভাগ এক্সপোর্ট ফরম্যাট লাইভ WebGL রাখতে পারে না
- Presenting মোডে (live slideshow) WebGL রেন্ডার চালু রাখা যাবে, যাতে rotation/animation লাইভ দেখা যায়

### ২.১ পারফরম্যান্স গার্ডরেল (Open Decision — কাজ শুরুর আগে কনফার্ম দরকার)

| প্রশ্ন | অপশন A | অপশন B |
|---|---|---|
| একই স্লাইডে একাধিক 3D text element থাকলে? | প্রতিটার আলাদা WebGL context (সহজ, কিন্তু GPU-ভারী) | একটাই shared renderer, সব element পালাক্রমে render (জটিল, কিন্তু হালকা) |
| এডিট মোডে (স্লাইড বানানোর সময়) সবসময় লাইভ 3D রেন্ডার? | হ্যাঁ, real-time | না — একটা "3D preview" থাম্বনেইল/স্ন্যাপশট দেখাবে, ডাবল-ক্লিক করলে লাইভ এডিটর খুলবে (ভারী না) |
| মোবাইল/লো-এন্ড ডিভাইসে fallback? | Quality preset অটো-লো (PLAN_2-এর Low/Medium/High রিইউজ) | 3D element-কে স্ট্যাটিক ইমেজ হিসেবে দেখাবে, শুধু export/present মোডে রেন্ডার |

**সুপারিশ:** শুরুতে অপশন B (snapshot-based editing + on-demand live editor) নেওয়া নিরাপদ — এটাই PLAN_2-এর ক্যানভাস-কার্ড প্যাটার্নের সাথে সবচেয়ে সামঞ্জস্যপূর্ণ এবং কম রিস্কি।

### ২.২ ধাপ ভিত্তিক ব্রেকডাউন

- [x] **Step 1 — Element type যোগ:** নতুন `text3d-el` টাইপ আলাদা রেজিস্টার না করে, বিদ্যমান `type:'image'` element-কেই রিইউজ করা হয়েছে + দুইটা extra ফিল্ড: `is3dText:true` আর `text3dParams:{text,font,size,depth,bevel,color,material,lighting,rotX,rotY,rotZ}`। এতে autosave (পুরো `slides` array-ই JSON.stringify হয় বলে) স্বয়ংক্রিয়ভাবেই নতুন ফিল্ডসহ কাজ করে — আলাদা ভেরিফাই লাগেনি।
- [x] **Step 2 — Insert flow:** টুলবারে "✨ 3D Text" বাটন (`presentation-3d-text-live.js`), ক্লিক করলে মিনি-এডিটর মোডাল খোলে (`presentation-3d-text-engine.mjs`) — Text/Font/Size/Depth/Bevel/Color/Material প্রিসেট (Matte, Glossy, Metal, Frosted Glass, Neon)/Lighting প্রিসেট (Studio, Dramatic, Soft, Neon Stage)/Rotation X-Y-Z। Export অংশ ইচ্ছাকৃতভাবে বাদ।
- [x] **Step 3 — Snapshot rendering:** "Insert to Slide" চাপলে `renderer.domElement.toDataURL('image/png')` দিয়ে transparent PNG স্ন্যাপশট নেয়া হয় (alpha:true renderer)।
- [x] **Step 4 — স্লাইডে বসানো ও transform:** স্ন্যাপশট আসলে একটা সাধারণ `image` element হওয়ায় বিদ্যমান move/resize/rotate হ্যান্ডেল, লেয়ারিং, এলিমেন্ট-অ্যানিমেশন — সব বিনা পরিবর্তনে কাজ করে।
- [x] **Step 5 — রি-এডিট:** 3D-text ইমেজে ডাবল-ক্লিক করলে (অথবা ডান পাশের প্যানেলে "✏️ Edit 3D Text" বাটনে) সেভ করা `text3dParams` লোড হয়ে মিনি-এডিটর আবার খোলে, আপডেট করলে একই element-এর `src`+`text3dParams` রিপ্লেস হয়।

**সেশন ১-এ যা করা হয়নি (ইচ্ছাকৃতভাবে, স্কোপ অনুযায়ী):** Step 6, 7, 8। সেশন ২-তে Step 7 ও 8 সম্পন্ন হয়েছে, Step 6 আটকে আছে একটা Open Decision-এ (নিচে দেখুন)।
- [x] **Step 6 — Animation preset হুক (সেশন ২, অপশন C অনুযায়ী):** ইউজার অপশন C (হালকা CSS 3D fake-rotate) বেছে নিয়েছেন। বিদ্যমান entrance/emphasis animation সিস্টেমে (`e.animation`) একটা নতুন প্রিসেট `spin3d` ("3D Spin (Y)") যোগ করা হয়েছে — `perspective(700px) rotateY(0→360deg)`, flat PNG-কে turntable-এর মতো ঘোরায়। এটা কোনো নতুন WebGL context বা নতুন UI মেকানিজম বানায়নি — বরং বিদ্যমান Animation ইন্সপেক্টরের "Effect" ড্রপডাউন + "Loop animation continuously" চেকবক্স (আগে থেকেই থাকা emphasis-effect infrastructure) রিইউজ করেছে, তাই 3D Text বসিয়ে Effect = 3D Spin + Loop অন করলেই Presenting মোডে এন্টার করার সাথে সাথে অনন্তকাল ঘুরতে থাকবে (স্লাইড পাল্টানো পর্যন্ত)। যেহেতু এই কোডবেসে animation frames-এর সংজ্ঞা একাধিক ফাইলে ডুপ্লিকেট করা থাকে (কনভেনশন অনুযায়ী), চারটা জায়গাতেই যোগ করা হয়েছে: `presentation-animations-plus.js` (ড্রপডাউন অপশন + লাইভ-এডিটর প্রিভিউ + সুপারসিডেড popup CSS), `presentation-animation-sequence.js` (আসল Presenting entry point — script-order চেক করে নিশ্চিত করা হয়েছে এটাই presentBtn-এর শেষ assignment), `presentation-player-fix.js` (আরেকটা dead-but-kept-in-parity duplicate, ভবিষ্যতে script-order বদলালে ভাঙবে না), ও `presentation-animation-loop.js` (Loop checkbox-এর জন্য emphasis Set-এ যোগ)। এটা এলিমেন্ট-টাইপ-নির্দিষ্ট নয়, তাই যেকোনো element (text/shape/image) থেকেও ব্যবহারযোগ্য — কিন্তু বেভেল/লাইটিং বেকড থাকা 3D-text স্ন্যাপশটে সবচেয়ে ভালো দেখাবে। অপশন D (আসল লাইভ WebGL rotation)-এর কথা প্ল্যানে থাকলেও এটা এখন আর করা হয়নি — যদি ভবিষ্যতে দরকার হয় §৯.৫-এর অপশন D নোট রেফারেন্স হিসেবে রাখা থাকল।
- [x] **Step 7 — Export pipeline compat (সেশন ২):** যাচাই করা হয়েছে, কোনো কোড পরিবর্তন লাগেনি। `presentation-exports.js`-এর `slideshow()` (HTML export) ও `videoExport()` (WebM export) — দুটোই `e.type==='image'` চেক করে জেনেরিকভাবে `e.src` থেকে ইমেজ আঁকে/বসায়, `is3dText`/`text3dParams` ফিল্ড উপেক্ষা করে (যা ঠিকই আছে, কারণ ওগুলো শুধু re-edit-এর জন্য দরকার)। যেহেতু data-URL ইমেজ ব্যবহার হয়, canvas taint/CORS সমস্যাও নেই। নোট: এই প্রজেক্টে এখনো আসল pptx/PDF export নেই (শুধু HTML slideshow + WebM ভিডিও) — সেটা আলাদা, এখনো অসম্পূর্ণ আইটেম (§৬, প্রায়োরিটি #৫)।
- [x] **Step 8 — Style presets + Brand kit (সেশন ২):** `presentation-brand-kit.js`-এ `text3dMaterial`/`text3dLighting`/`text3dColor` ফিল্ড যোগ ও `window.PresentationBrandKit.{get,saveText3DStyle}` এক্সপোজ করা হয়েছে। 3D Text মিনি-এডিটরে নতুন "★ Save as default style" বাটন — চাপলে বর্তমান material+lighting+color ব্র্যান্ড কিটে সেভ হয়। এরপর থেকে **নতুন** 3D Text insert করলে (re-edit না) ডিফল্ট material/lighting/color সেই সেভ করা স্টাইল থেকে আসে (`defaultParams()`-এ merge করা)। Brand Kit প্যানেলে একটা ছোট রিড-অনলি সামারি লাইন + Clear বাটন যোগ হয়েছে। `presentation-3d-text-engine.mjs` লোড হওয়ার আগেই `presentation-brand-kit.js` লোড হয় বলে (HTML script-order চেক করা হয়েছে) কোনো race condition নেই; তারপরও `window.PresentationBrandKit` না থাকলে বাটন লুকিয়ে যায় (defensive)।

**Milestone:** ইউজার আলাদা কোনো টুল না খুলে স্লাইডের ভেতরেই 3D টেক্সট বসাতে, এডিট করতে ও প্রেজেন্ট করার সময় অ্যানিমেটেড দেখতে পারবে।

---

## ৩. স্ট্রাকচার আপগ্রেড (Slide organization)

- [ ] **Slide Master / Layout inheritance** — একটা মাস্টার লেআউট বদলালে যেসব স্লাইড সেই লেআউট ব্যবহার করছে সেগুলোতে propagate হবে (বিদ্যমান `presentation-layout-templates.js` টেমপ্লেট প্রয়োগ করে, কিন্তু পরে লিংক ভেঙে যায় কিনা চেক করা দরকার — লিংকড রাখতে হলে ডেটা মডেলে "based on layout X" রেফারেন্স রাখতে হবে)
- [ ] **Section grouping** — বাম প্যানেলের স্লাইড লিস্টে স্লাইডগুলোকে collapsible section/chapter-এ ভাগ করা (বড় ডেকের জন্য)
- [ ] **Outline view** — একটা টগল যা পুরো ডেক-কে শুধু টেক্সট আউটলাইন হিসেবে দেখাবে (title + bullet), দ্রুত রিঅর্ডার/এডিটের জন্য

---

## ৪. ডিজাইন/ভিজ্যুয়াল আপগ্রেড

- [ ] **Slide Morph/Zoom transition** — দুই স্লাইডের মধ্যে common element থাকলে (একই id) সেটা smooth move/scale/fade করে transition (PowerPoint Morph-এর মতো) — `presentation-color-toolbar.js`-এর transition dropdown-এ নতুন অপশন হিসেবে যোগ
- [ ] **Icon/vector shape library** — সার্চেবল SVG আইকন প্যানেল (বিদ্যমান `presentation-shapes.js`-এর পাশে নতুন প্যানেল ট্যাব)
- [ ] **Smart Designer সম্প্রসারণ** — বিদ্যমান `presentation-smart-designer.js`-কে আরও এগিয়ে নিয়ে: কনটেন্ট (কতটুকু টেক্সট/ছবি আছে) বিশ্লেষণ করে ২-৩টা লেআউট সাজেশন কার্ড দেখানো
- [ ] **Duotone/gradient photo filter প্রিসেট** — image inspector-এ কুইক ফিল্টার বাটন

---

## ৫. কনটেন্ট টুল আপগ্রেড

- [ ] **SmartArt-এর মতো diagram builder** — process flow / hierarchy / timeline টেমপ্লেট, টেক্সট বসালেই অটো-লেআউট (নতুন `presentation-diagrams.js`)
- [ ] **Table style presets** — বিদ্যমান `presentation-tables.js`-এ ready-made থিম (striped, bordered, minimal) যোগ
- [ ] **Chart entry animation** — বিদ্যমান `presentation-charts.js`-এ bar/line গ্রো-ইন অ্যানিমেশন

---

## ৬. প্রেজেন্টিং, কোলাবরেশন ও এক্সপোর্ট আপগ্রেড

- [ ] **Speaker notes প্যানেল** — প্রতিটা স্লাইডের সাথে নোট সেভ (ডেটা মডেলে নতুন ফিল্ড, ছোট কাজ)
- [ ] **Presenter view** — স্পিকার নোট + পরের স্লাইড প্রিভিউ + টাইমার, আলাদা উইন্ডো/স্ক্রিনে (বিদ্যমান `presentation-presenter-links.js` কতদূর করে সেটা আগে অডিট করা দরকার, তারপর gap বোঝা যাবে)
- [ ] **Native .pptx export** — এখন export ঠিক কোন ফরম্যাটে হয় (`presentation-exports.js` অডিট করে) সেটা যাচাই করে, না থাকলে actual Open XML `.pptx` জেনারেট করা (এটা মাঝারি-বড় কাজ, একটা লাইব্রেরি যেমন `pptxgenjs` লাগতে পারে)
- [ ] **PDF export (speaker notes সহ)**
- [ ] **Real-time collaboration** — সবচেয়ে বড় ও জটিল আইটেম (একাধিক ইউজার + conflict resolution/sync backend লাগবে) — আলাদা প্ল্যান ডকুমেন্ট প্রাপ্য, এই প্ল্যানের স্কোপে শুধু "future roadmap" হিসেবে নোট রাখা হলো
- [ ] **Comments/annotations** — element-এ pin করে কমেন্ট রাখা

---

## ৭. পলিশ ও ছোট আইটেম (কম effort, ভালো ROI)

- [ ] Undo/redo history ভিজ্যুয়াল প্যানেল (এখন শুধু Ctrl+Z আছে বলে ধারণা করা হচ্ছে — কনফার্ম করা দরকার)
- [ ] Alignment toolbar (smart-guides.js আছে, কিন্তু বাটন দিয়ে distribute/align center নেই মনে হচ্ছে)
- [ ] Rulers + snap-to-grid টগল
- [ ] কীবোর্ড শর্টকাট cheat-sheet (মডাল বা টুলটিপ)

---

## ৮. প্রায়োরিটি অর্ডার (প্রস্তাবিত)

| ক্রম | আইটেম | কারণ |
|---|---|---|
| ১ | 3D Text native integration (§২) — শুধু Step 1-5 (লাইভ animation ছাড়া) | সবচেয়ে চাওয়া ফিচার, standalone tool-এর ভোগান্তি দূর করবে |
| ২ | Speaker notes + Presenter view audit (§৬) | কম effort, presenting experience-এ বড় পার্থক্য |
| ৩ | Alignment toolbar + Undo history UI (§৭) | কম effort, প্রতিদিনের এডিটিং অনেক স্মুথ করবে |
| ৪ | Slide Master inheritance + Section grouping (§৩) | বড় ডেক ম্যানেজ করা সহজ করবে |
| ৫ | Native .pptx export (§৬) | কম্প্যাটিবিলিটির জন্য গুরুত্বপূর্ণ, কিন্তু মাঝারি effort |
| ৬ | 3D Text-এর animation hook + Morph transition (§২ Step 6, §৪) | ভিজ্যুয়াল "wow factor", কিন্তু আগেরগুলোর উপর নির্ভরশীল |
| ৭ | SmartArt/Diagram builder, Icon library (§৫, §৪) | বড় কাজ, ইনক্রিমেন্টালি করা যায় |
| ৮ | Real-time collaboration (§৬) | সবচেয়ে বড় স্কোপ, আলাদা প্ল্যান ডকুমেন্ট লাগবে |

---

## ৯. Open Decisions — ✅ কনফার্ম হয়ে গেছে (সেশন ১)

ইউজারের পিসি স্পেক কম হওয়ায় সবসময় হালকা/কম-রিসোর্স অপশন বেছে নেয়া হয়েছে:

1. **§২.১ পারফরম্যান্স গার্ডরেল:** ✅ অপশন B — স্ন্যাপশট-বেসড এডিটিং। এডিট মোডে সবসময় লাইভ WebGL চলে না; মিনি-এডিটর মোডাল খোলা অবস্থাতেই শুধু একটা WebGL context চালু থাকে, মোডাল বন্ধ করলেই renderer dispose হয়ে যায় (`presentation-3d-text-engine.mjs`-এর `cleanup()` দেখুন)।
2. **একাধিক 3D element রেন্ডারিং:** ✅ আপাতত চিন্তা করা হয়নি — যেহেতু স্ন্যাপশট-বেসড, একসাথে সর্বোচ্চ একটাই লাইভ WebGL context লোড হয় (যেটা তখন এডিট করা হচ্ছে সেটা), বাকি সব স্লাইডে শুধু static PNG। তাই মাল্টিপল-context পারফরম্যান্স সমস্যা structurally এড়ানো গেছে।
3. **pptx export:** ✅ পরে করব — সেশন ১-এ স্কিপ করা হয়েছে, প্রায়োরিটি #৫ অনুযায়ী পরের সেশনে ধরা হবে।
4. **মিনি-এডিটরে কোন কোন প্যানেল:** ✅ সরলীকৃত সাবসেট — Text, Font (৬টা), Size, Depth, Bevel toggle, Color, Material প্রিসেট (৫টা: Matte/Glossy/Metal/Frosted Glass/Neon), Lighting প্রিসেট (৪টা: Studio/Dramatic/Soft/Neon Stage), Rotation X/Y/Z। Shadow/Reflection/Animation-preset প্যানেল বাদ (ভারী + Step 6/8-এর স্কোপ)।

5. **Step 6 (animation hook) — 🔴 নতুন Open Decision (সেশন ২ থেকে, কাজ শুরুর আগে কনফার্ম দরকার):** মূল প্ল্যানে লেখা ছিল Presenting মোডে লাইভ WebGL রোটেশন লাগবে। কিন্তু সেটা করতে গেলে Presenting popup window-এ (যেটা এখন `document.write` দিয়ে বানানো একটা আলাদা blank window — `presentation-animation-sequence.js`-এর `present()` ফাংশন) নতুন করে Three.js + vendor ফন্ট ফাইল লোড করতে হবে। ইউজারের পিসি স্পেক কম হওয়ায় (§৯-এর মূল Option B সিদ্ধান্তের কারণ) এবং popup window-এ relative path/module import ব্রাউজার-ভেদে কতটা নির্ভরযোগ্য সেটা অনিশ্চিত হওয়ায় (বিশেষত Electron build-এ, `main-electron.js` আছে বলে দেখা গেছে), এই কাজ শুরুর আগে দুটো হালকা বিকল্প থেকে বেছে নেওয়া দরকার:

   - **অপশন C (হালকা, প্রস্তাবিত):** সত্যিকারের লাইভ WebGL Presenting-এ চালু না করে, বরং flat PNG স্ন্যাপশটের ওপর CSS 3D transform (`perspective()` + `rotateY()`/`rotateX()`) দিয়ে "ঘোরার" ভান তৈরি করা — entrance animation হিসেবে বিদ্যমান `e.animation` সিস্টেমে (`presentation-animation-sequence.js`-এর `frames` অবজেক্ট) নতুন ২-৩টা এন্ট্রি যোগ করে (যেমন `spin3d`, `flipIn`)। কোনো নতুন WebGL context লাগবে না, কোনো নতুন ফাইল popup-এ লোড করতে হবে না, রিস্ক প্রায় শূন্য — কিন্তু আসল ৩D জ্যামিতি ঘোরে না, শুধু texture-টা ঘোরার মতো দেখায় (bevel/material-এর lighting fixed থাকে, camera না)।
   - **অপশন D (আসল লাইভ WebGL, ভারী):** প্ল্যানের মূল ভিশন অনুযায়ী — Presenting popup-এ vendor/three + vendor/fonts + engine-এর রেন্ডার লজিকের একটা ছোট সংস্করণ লোড করে, শুধু 3D-text এলিমেন্টগুলোর জন্য একটা লাইভ WebGL layer বসানো। আসল ৩D ঘোরা দেখা যাবে, কিন্তু কম-স্পেক পিসিতে/Electron-এ টেস্ট করা দরকার, এবং একাধিক 3D-text এলিমেন্ট একই স্লাইডে থাকলে §২.১-এর পারফরম্যান্স গার্ডরেল আবার প্রাসঙ্গিক হয়ে যায় (এতদিন এড়ানো গিয়েছিল যেহেতু এডিট মোডে সবসময় সর্বোচ্চ একটা context থাকে — Presenting মোডে এই নিশ্চয়তা আর থাকবে না)।

   ইউজারের উত্তর ছাড়া এই ধাপ শুরু করা হয়নি।

---

## ১০. পরবর্তী সেশনের জন্য নোট (মূল, প্রথম সেশনের আগে লেখা)

এই ফাইলটা প্রজেক্ট রুটে (`PLAN_4_PowerPoint_Section_Upgrade.md`) রাখা আছে। পরের সেশনে এই ফাইল + পুরো `photo-and-text-editor` প্রজেক্ট ফোল্ডার (বা অন্তত `presentation-*.js` + `3d-text-module-phase5-quality/`) আপলোড করলে সরাসরি §৮-এর প্রায়োরিটি অর্ডার অনুযায়ী Step 1 থেকে কোডিং শুরু করা যাবে। কাজ শুরুর আগে §৯-এর Open Decisions-এর উত্তর দিয়ে দিলে দ্রুত এগোনো যাবে।

---

## ১১. সেশন ১ — যা তৈরি হয়েছে (ইমপ্লিমেন্টেশন নোট)

**নতুন ফাইল (৪টা, root-এ, `photo-and-text-editor/` ফোল্ডারে বসাতে হবে):**

- `presentation-3d-text-engine.mjs` — Three.js মিনি-এডিটর ইঞ্জিন (ES module)। Text → TextGeometry → material preset → lighting preset → transparent PNG snapshot। `window.Presentation3DText.open(existingParamsOrNull, onInsertCallback)` এক্সপোজ করে।
- `presentation-3d-text-live.js` — টুলবার বাটন ("✨ 3D Text"), lazy dynamic `import()` দিয়ে engine লোড করা, insert/re-edit ফ্লো, ইন্সপেক্টরে "Edit 3D Text" বাটন। `presentation-studio.html`-এর একদম শেষে `<script src="presentation-3d-text-live.js?v=1">` হিসেবে লোড হয়।
- `vendor/three/three.module.js`, `vendor/three/addons/FontLoader.js`, `vendor/three/addons/TextGeometry.js` — three.js **r160**, npm প্যাকেজ থেকে vendor করা (CDN নির্ভরতা নেই, gif.js-এর মতোই লোকাল ফাইল কনভেনশন মেনে)। **⚠️ গুরুত্বপূর্ণ:** এই ভার্সনে `TextGeometry` প্যারামিটারের নাম `height` (আমাদের নিজের `depth` ফিল্ড থেকে ম্যাপ করা হয়েছে) — `depth` নামে সরাসরি পাস করলে silently ignore হয়ে ৫০-ইউনিট ডিফল্ট depth বসে যেত, যেটা আগে ধরা পড়েছে ও ফিক্স করা হয়েছে।
- `vendor/fonts/*.typeface.json` — ৬টা ফন্ট (Helvetiker Bold, Montserrat, Playfair Display, Bungee, Lobster, Pacifico), 3d-text-module থেকে কপি করা।

**পরিবর্তিত ফাইল:** `presentation-studio.html` — মাত্র ১ লাইন যোগ (নতুন script tag রেজিস্ট্রেশন), আর কিছু টাচ করা হয়নি।

**Data model:** `text3d-el` নামে আলাদা element type রেজিস্টার করা হয়নি (প্ল্যানে যেমন প্রস্তাব ছিল) — বরং বিদ্যমান `type:'image'` element রিইউজ করা হয়েছে, উপরে দুইটা extra ফিল্ড (`is3dText`, `text3dParams`) যোগ করে। এতে move/resize/rotate/layering/animation/autosave/export — সব বিদ্যমান পাইপলাইন বিনা পরিবর্তনে কাজ করে (regression risk প্রায় শূন্য), যেটা প্ল্যানের মূল লক্ষ্যের (§১-এর ⚠️ নোট) সাথেই সবচেয়ে বেশি সামঞ্জস্যপূর্ণ।

**যাচাই করা হয়েছে (এই সেশনে, sandbox-এ):** সব নতুন `.js`/`.mjs` ও vendor ফাইলে `node --check` দিয়ে syntax ভ্যালিডেশন পাস, font JSON-গুলো ভ্যালিড, HTML-এ script tag ঠিকমতো বসেছে, dblclick/render/inspector hook-এ কোনো বিদ্যমান কোডের সাথে conflict নেই (গ্রেপ করে চেক করা হয়েছে)। **যাচাই করা যায়নি:** আসল ব্রাউজার/Electron-এ রান করে ভিজ্যুয়াল/রানটাইম টেস্ট — sandbox-এ হেডলেস ব্রাউজার ছিল না, তাই ব্যবহারকারীর নিজের মেশিনে প্রথমবার খুলেই একটু বেশি মনোযোগ দিয়ে টেস্ট করা উচিত।

**পরের সেশনে বাকি কাজ (§৮ প্রায়োরিটি অনুযায়ী):**
- Step 6-8 (animation hook, export pipeline audit বিশেষত ভিডিও এক্সপোর্টে 3D-text ইমেজ ঠিকমতো আঁকা হয় কিনা, brand kit presets)
- §৬-এর Speaker notes / Presenter view audit (প্রায়োরিটি #২)
- Alignment toolbar + Undo history UI (প্রায়োরিটি #৩)

---

## ১২. সেশন ২ — যা তৈরি হয়েছে (ইমপ্লিমেন্টেশন নোট)

**ইনপুট:** এই সেশনে ইউজার পুরো `photo-and-text-editor` প্রজেক্ট ফোল্ডার (zip) আপলোড করেছেন, যাতে Step 6-8-এর জন্য দরকারি সব বিদ্যমান ফাইল (`presentation-exports.js`, `presentation-brand-kit.js`, `presentation-animation-sequence.js`, `presentation-animations-plus.js`, `presentation-animation-loop.js`, `presentation-player-fix.js` ইত্যাদি) পাওয়া গেছে।

**পরিবর্তিত ফাইল (৬টা):**

- `presentation-exports.js` — **কোনো পরিবর্তন লাগেনি** (Step 7, শুধু অডিট/ভেরিফিকেশন — §২.২-এ বিস্তারিত)।
- `presentation-brand-kit.js` — kit অবজেক্টে `text3dMaterial`/`text3dLighting`/`text3dColor` ফিল্ড, প্যানেলে সামারি লাইন + Clear বাটন, `window.PresentationBrandKit.{get,saveText3DStyle}` এক্সপোজ (Step 8)।
- `presentation-3d-text-engine.mjs` — `defaultParams()` এখন Brand Kit-এ সেভ করা style থাকলে সেটা দিয়ে নতুন insert শুরু করে; মডাল ফুটারে "★ Save as default style" বাটন যোগ (Step 8)।
- `presentation-animations-plus.js` — Emphasis গ্রুপে নতুন "3D Spin (Y)" (`spin3d`) অপশন + frames এন্ট্রি + (সুপারসিডেড popup পাথে) CSS keyframes (Step 6)।
- `presentation-animation-sequence.js` — আসল Presenting entry point-এর frames অবজেক্টে `spin3d` যোগ (Step 6, এটাই লাইভে কার্যকর)।
- `presentation-player-fix.js` — dead-but-kept-in-parity duplicate frames-এ `spin3d` যোগ (Step 6, robustness)।
- `presentation-animation-loop.js` — Loop-eligible emphasis Set-এ `spin3d` যোগ, hint টেক্সট আপডেট (Step 6)।

**যাচাই করা হয়েছে:** সব `.js`/`.mjs` ফাইলে `node --check` দিয়ে syntax পাস। `presentBtn.onclick`-এর জন্য কোন ফাইল "জেতে" তা script-load-order গ্রেপ করে নিশ্চিত করা হয়েছে (`presentation-animation-sequence.js`-ই শেষ assignment, তাই ওখানকার `spin3d` ফ্রেমই আসলে Presenting মোডে চলবে)। ভিডিও এক্সপোর্ট ও HTML slideshow এক্সপোর্ট — দুটোই `e.type==='image'` জেনেরিক পাথে 3D-text স্ন্যাপশট আঁকে, যাচাই করা হয়েছে কোনো বিশেষ handling ছাড়াই কাজ করে (data-URL হওয়ায় canvas taint সমস্যাও নেই)।

**যাচাই করা যায়নি:** আগের সেশনের মতোই — sandbox-এ হেডলেস ব্রাউজার নেই, তাই আসল ব্রাউজার/Electron-এ `spin3d` visually কেমন লাগছে (বিশেষত Loop সহ Presenting মোডে) সেটা ব্যবহারকারীর নিজের মেশিনে টেস্ট করা উচিত। "★ Save as default style" বাটনের ফ্লো (Brand Kit-এ সেভ → পরের নতুন insert-এ অটো-প্রয়োগ) ম্যানুয়ালি ব্রাউজারে ক্লিক করে যাচাই করা যায়নি।

**Open Decision (§৯.৫)-এর ফলাফল:** ইউজার অপশন C বেছেছেন — অপশন D (আসল লাইভ WebGL rotation in Presenting popup) আর করা হয়নি, ভবিষ্যতের জন্য নোট আকারে থেকে গেল।

**পরের সেশনে বাকি কাজ (§৮ প্রায়োরিটি অনুযায়ী, এখন §২ পুরোপুরি শেষ):**
- প্রায়োরিটি #২: Speaker notes প্যানেল + Presenter view অডিট (§৬)
- প্রায়োরিটি #৩: Alignment toolbar + Undo history ভিজ্যুয়াল প্যানেল (§৭)


---

## ১৩. সেশন ৩ — Speaker notes + Presenter view audit

- [x] **Speaker notes persistence audit:** presentation-presenter-links.js-এর notes textarea আগে slide model আপডেট করলেও rerender না হওয়ায় reliable autosave scheduler চালু হতো না। ফলে শুধু notes লিখে refresh/close করলে সর্বশেষ লেখা হারানোর ঝুঁকি ছিল।
- [x] **Fix:** presentation-reliable-autosave.js এখন presentation:change event শোনে এবং window.presentationSaveNow প্রকাশ করে। Notes বা ভবিষ্যতের কোনো inspector rerender ছাড়া data বদলালে ওই event dispatch করে একই debounced IndexedDB autosave path ব্যবহার করতে পারবে।
- [x] **Presenter view audit:** বিদ্যমান Presenter View-তে current-slide preview, next-slide preview, per-slide speaker notes, slide counter, elapsed timer এবং keyboard/button navigation আছে। Notes field slides data model-এর অংশ; তাই portable project JSON এবং IndexedDB snapshot—দুই ক্ষেত্রেই সংরক্ষিত হয়।
- [x] **Presenter sync:** Presenter View খোলার সাথে audience slideshow window খোলে। Presenter-এর Next/Previous button ওই window-কে নিয়ন্ত্রণ করে; click-to-reveal animation চললে preview আগায় না, তাই দুই window একই slide-এ থাকে।
- **পরের কাজ:** §৮ প্রায়োরিটি #৩ — Alignment toolbar + Undo history UI।
