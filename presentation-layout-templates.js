(() => {
  const $ = id => document.getElementById(id);

  // High quality SVG icons as default badge images
  const ticketSvg = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" width="120" height="100">
      <rect width="120" height="100" rx="18" fill="#784421"/>
      <rect x="5" y="5" width="110" height="90" rx="14" fill="#a05a2c" stroke="#ffffff" stroke-width="3"/>
      <rect x="18" y="24" width="84" height="52" rx="8" fill="#38bdf8" stroke="#ffffff" stroke-width="2"/>
      <circle cx="18" cy="50" r="8" fill="#a05a2c"/>
      <circle cx="102" cy="50" r="8" fill="#a05a2c"/>
      <line x1="38" y1="36" x2="82" y2="36" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
      <line x1="38" y1="50" x2="70" y2="50" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
      <line x1="38" y1="62" x2="60" y2="62" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `);

  const gdsSvg = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" width="120" height="100">
      <rect width="120" height="100" rx="18" fill="#cbd5e1"/>
      <rect x="5" y="5" width="110" height="90" rx="14" fill="#f8fafc" stroke="#ffffff" stroke-width="3"/>
      <rect x="22" y="16" width="76" height="68" rx="6" fill="#ffffff" stroke="#94a3b8" stroke-width="2"/>
      <rect x="30" y="24" width="60" height="8" rx="2" fill="#0284c7"/>
      <line x1="30" y1="42" x2="90" y2="42" stroke="#64748b" stroke-width="3" stroke-linecap="round"/>
      <line x1="30" y1="54" x2="80" y2="54" stroke="#64748b" stroke-width="3" stroke-linecap="round"/>
      <line x1="30" y1="66" x2="70" y2="66" stroke="#64748b" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `);

  const labSvg = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" width="120" height="100">
      <rect width="120" height="100" rx="18" fill="#475569"/>
      <rect x="5" y="5" width="110" height="90" rx="14" fill="#e2e8f0" stroke="#ffffff" stroke-width="3"/>
      <rect x="20" y="18" width="80" height="50" rx="6" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
      <rect x="26" y="24" width="68" height="38" rx="3" fill="#38bdf8"/>
      <polygon points="52,68 68,68 74,82 46,82" fill="#64748b"/>
      <line x1="36" y1="82" x2="84" y2="82" stroke="#334155" stroke-width="4" stroke-linecap="round"/>
    </svg>
  `);

  const officeSvg = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" width="120" height="100">
      <rect width="120" height="100" rx="18" fill="#0f172a"/>
      <rect x="5" y="5" width="110" height="90" rx="14" fill="#1e293b" stroke="#ffffff" stroke-width="3"/>
      <rect x="30" y="18" width="60" height="66" rx="4" fill="#0284c7" stroke="#38bdf8" stroke-width="2"/>
      <rect x="38" y="26" width="10" height="10" rx="2" fill="#f8fafc"/>
      <rect x="55" y="26" width="10" height="10" rx="2" fill="#f8fafc"/>
      <rect x="72" y="26" width="10" height="10" rx="2" fill="#f8fafc"/>
      <rect x="38" y="42" width="10" height="10" rx="2" fill="#f8fafc"/>
      <rect x="55" y="42" width="10" height="10" rx="2" fill="#f8fafc"/>
      <rect x="72" y="42" width="10" height="10" rx="2" fill="#f8fafc"/>
      <rect x="52" y="62" width="16" height="22" rx="2" fill="#facc15"/>
    </svg>
  `);

  const customTemplates = [
    {
      id: 'course-benefits',
      name: 'Course Features (কোর্স সুবিধা)',
      category: 'Infographics',
      desc: 'কেন আমাদের প্রতিষ্ঠানে কোর্স করবেন? (3D Feature List with Uploadable Badges)',
      badge: '★ Featured',
      bg: 'custom',
      bgColor: '#cf7563',
      elements: [
        // Header Angled Title Banner
        {
          id: crypto.randomUUID(),
          type: 'shape',
          shape: 'round',
          text: 'কেন আমাদের এই প্রতিষ্ঠানে\nকোর্স  টি করবেন?',
          textColor: '#ffffff',
          textSize: 25,
          textWeight: '900',
          textAlign: 'center',
          x: 20,
          y: 6,
          w: 60,
          h: 15,
          fill: '#e8a855',
          stroke: '#c88732',
          line: 2,
          opacity: 100,
          rotation: 0
        },
        // Row 1: Ticket Badge (Image) + Benefit Pill
        {
          id: crypto.randomUUID(),
          type: 'image',
          src: ticketSvg,
          x: 16,
          y: 24,
          w: 13,
          h: 14,
          rotation: 0
        },
        {
          id: crypto.randomUUID(),
          type: 'shape',
          shape: 'round',
          text: 'টিকেটিং এর রিফান্ড এবং রিইস্যু',
          textColor: '#ffffff',
          textSize: 19,
          textWeight: '800',
          textAlign: 'center',
          x: 31,
          y: 24,
          w: 53,
          h: 14,
          fill: '#9d53da',
          stroke: '#7e32be',
          line: 2,
          opacity: 100,
          rotation: 0
        },
        // Row 2: GDS Badge (Image) + Benefit Pill
        {
          id: crypto.randomUUID(),
          type: 'image',
          src: gdsSvg,
          x: 16,
          y: 41,
          w: 13,
          h: 14,
          rotation: 0
        },
        {
          id: crypto.randomUUID(),
          type: 'shape',
          shape: 'round',
          text: 'জিডিএস এর সাব-আইডি',
          textColor: '#1e293b',
          textSize: 20,
          textWeight: '900',
          textAlign: 'center',
          x: 31,
          y: 41,
          w: 53,
          h: 14,
          fill: '#fde0b2',
          stroke: '#d8aa6b',
          line: 2,
          opacity: 100,
          rotation: 0
        },
        // Row 3: Lab Badge (Image) + Benefit Pill
        {
          id: crypto.randomUUID(),
          type: 'image',
          src: labSvg,
          x: 16,
          y: 58,
          w: 13,
          h: 14,
          rotation: 0
        },
        {
          id: crypto.randomUUID(),
          type: 'shape',
          shape: 'round',
          text: 'প্র্যাকটিস ল্যাব এর সুবিধা',
          textColor: '#ffffff',
          textSize: 19,
          textWeight: '800',
          textAlign: 'center',
          x: 31,
          y: 58,
          w: 53,
          h: 14,
          fill: '#64748b',
          stroke: '#475569',
          line: 2,
          opacity: 100,
          rotation: 0
        },
        // Row 4: Office Badge (Image) + Benefit Pill
        {
          id: crypto.randomUUID(),
          type: 'image',
          src: officeSvg,
          x: 16,
          y: 75,
          w: 13,
          h: 14,
          rotation: 0
        },
        {
          id: crypto.randomUUID(),
          type: 'shape',
          shape: 'round',
          text: 'নিজস্ব অফিস',
          textColor: '#0f172a',
          textSize: 20,
          textWeight: '900',
          textAlign: 'center',
          x: 31,
          y: 75,
          w: 53,
          h: 14,
          fill: '#38bdf8',
          stroke: '#0284c7',
          line: 2,
          opacity: 100,
          rotation: 0
        }
      ]
    },
    {
      id: 'pricing-arrow-matrix',
      name: 'Visa & Course Pricing (কোর্স ও ভিসা ফি)',
      category: 'Infographics',
      desc: 'Arrow / Chevron Course Pricing Matrix',
      badge: '★ Featured',
      bg: 'custom',
      bgColor: '#6fe3f8',
      elements: [
        // Title
        {
          id: crypto.randomUUID(),
          type: 'text',
          text: 'কোর্স ও সার্ভিস ফি তালিকা',
          color: '#06344d',
          size: 34,
          weight: '900',
          textAlign: 'center',
          x: 10,
          y: 4,
          w: 80,
          h: 9,
          rotation: 0
        },
        // Row 1
        {
          id: crypto.randomUUID(),
          type: 'shape',
          shape: 'round',
          text: 'Visa\n(Tourist, Medical, Business)',
          textColor: '#ffffff',
          textSize: 13,
          textWeight: '800',
          textAlign: 'center',
          x: 6,
          y: 15,
          w: 36,
          h: 13,
          fill: '#f59e0b',
          stroke: '#ffffff',
          line: 1.5,
          opacity: 100,
          rotation: 0
        },
        {
          id: crypto.randomUUID(),
          type: 'shape',
          shape: 'chevron',
          text: '• 10000/-',
          textColor: '#0f172a',
          textSize: 20,
          textWeight: '900',
          textAlign: 'center',
          x: 44,
          y: 15,
          w: 50,
          h: 13,
          fill: '#fef3c7',
          stroke: '#ffffff',
          line: 1.5,
          opacity: 100,
          rotation: 0
        },
        // Row 2
        {
          id: crypto.randomUUID(),
          type: 'shape',
          shape: 'round',
          text: 'Ticketing (Basic)',
          textColor: '#ffffff',
          textSize: 15,
          textWeight: '800',
          textAlign: 'center',
          x: 6,
          y: 31,
          w: 36,
          h: 13,
          fill: '#e11d48',
          stroke: '#ffffff',
          line: 1.5,
          opacity: 100,
          rotation: 0
        },
        {
          id: crypto.randomUUID(),
          type: 'shape',
          shape: 'chevron',
          text: '• 15000/-',
          textColor: '#0f172a',
          textSize: 20,
          textWeight: '900',
          textAlign: 'center',
          x: 44,
          y: 31,
          w: 50,
          h: 13,
          fill: '#ffe4e6',
          stroke: '#ffffff',
          line: 1.5,
          opacity: 100,
          rotation: 0
        },
        // Row 3
        {
          id: crypto.randomUUID(),
          type: 'shape',
          shape: 'round',
          text: 'Visa\n(Student Visa)',
          textColor: '#ffffff',
          textSize: 14,
          textWeight: '800',
          textAlign: 'center',
          x: 6,
          y: 47,
          w: 36,
          h: 13,
          fill: '#9333ea',
          stroke: '#ffffff',
          line: 1.5,
          opacity: 100,
          rotation: 0
        },
        {
          id: crypto.randomUUID(),
          type: 'shape',
          shape: 'chevron',
          text: '• 13000/-',
          textColor: '#0f172a',
          textSize: 20,
          textWeight: '900',
          textAlign: 'center',
          x: 44,
          y: 47,
          w: 50,
          h: 13,
          fill: '#f3e8ff',
          stroke: '#ffffff',
          line: 1.5,
          opacity: 100,
          rotation: 0
        },
        // Row 4
        {
          id: crypto.randomUUID(),
          type: 'shape',
          shape: 'round',
          text: 'Air Ticketing (Advance)',
          textColor: '#ffffff',
          textSize: 14,
          textWeight: '800',
          textAlign: 'center',
          x: 6,
          y: 63,
          w: 36,
          h: 13,
          fill: '#0284c7',
          stroke: '#ffffff',
          line: 1.5,
          opacity: 100,
          rotation: 0
        },
        {
          id: crypto.randomUUID(),
          type: 'shape',
          shape: 'chevron',
          text: '• 15000/-',
          textColor: '#0f172a',
          textSize: 20,
          textWeight: '900',
          textAlign: 'center',
          x: 44,
          y: 63,
          w: 50,
          h: 13,
          fill: '#e0f2fe',
          stroke: '#ffffff',
          line: 1.5,
          opacity: 100,
          rotation: 0
        },
        // Row 5
        {
          id: crypto.randomUUID(),
          type: 'shape',
          shape: 'round',
          text: 'Travel Agency\nBusiness Management',
          textColor: '#ffffff',
          textSize: 13,
          textWeight: '800',
          textAlign: 'center',
          x: 6,
          y: 79,
          w: 36,
          h: 13,
          fill: '#059669',
          stroke: '#ffffff',
          line: 1.5,
          opacity: 100,
          rotation: 0
        },
        {
          id: crypto.randomUUID(),
          type: 'shape',
          shape: 'chevron',
          text: '• 10000/-',
          textColor: '#0f172a',
          textSize: 20,
          textWeight: '900',
          textAlign: 'center',
          x: 44,
          y: 79,
          w: 50,
          h: 13,
          fill: '#d1fae5',
          stroke: '#ffffff',
          line: 1.5,
          opacity: 100,
          rotation: 0
        }
      ]
    },
    {
      id: 'step-process-roadmap',
      name: '4-Step Roadmap (প্রসেস ও রোডম্যাপ)',
      category: 'Infographics',
      desc: 'Step 1 to Step 4 Process Cards with Badges',
      badge: 'Popular',
      bg: 'fashion',
      bgColor: '#17233c',
      elements: [
        { id: crypto.randomUUID(), type: 'text', text: 'আমাদের কোর্স সম্পন্ন করার ৪টি সহজ ধাপ', color: '#ffffff', size: 34, weight: '900', textAlign: 'center', x: 10, y: 8, w: 80, h: 9 },
        { id: crypto.randomUUID(), type: 'shape', shape: 'round', text: 'ধাপ ০১\nকোর্স নির্বাচন', textColor: '#ffffff', textSize: 16, textWeight: '900', textAlign: 'center', x: 8, y: 28, w: 19, h: 36, fill: '#3b82f6', stroke: '#93c5fd', line: 2, opacity: 100 },
        { id: crypto.randomUUID(), type: 'shape', shape: 'round', text: 'ধাপ ০২\nপ্র্যাকটিক্যাল ট্রেনিং', textColor: '#ffffff', textSize: 16, textWeight: '900', textAlign: 'center', x: 30, y: 28, w: 19, h: 36, fill: '#8b5cf6', stroke: '#c4b5fd', line: 2, opacity: 100 },
        { id: crypto.randomUUID(), type: 'shape', shape: 'round', text: 'ধাপ ০৩\nলাইভ প্রজেক্ট ও ল্যাব', textColor: '#ffffff', textSize: 16, textWeight: '900', textAlign: 'center', x: 52, y: 28, w: 19, h: 36, fill: '#ec4899', stroke: '#fbcfe8', line: 2, opacity: 100 },
        { id: crypto.randomUUID(), type: 'shape', shape: 'round', text: 'ধাপ ০৪\nসার্টিফিকেট ও সাপোর্ট', textColor: '#ffffff', textSize: 16, textWeight: '900', textAlign: 'center', x: 74, y: 28, w: 19, h: 36, fill: '#10b981', stroke: '#a7f3d0', line: 2, opacity: 100 },
        { id: crypto.randomUUID(), type: 'shape', shape: 'round', text: 'আজই রেজিস্ট্রেশন করুন →', textColor: '#ffffff', textSize: 18, textWeight: '900', textAlign: 'center', x: 32, y: 72, w: 36, h: 12, fill: '#f59e0b', stroke: '#fde68a', line: 2, opacity: 100 }
      ]
    },
    {
      id: 'course-comparison',
      name: '3-Tier Comparison (প্যাকেজ তুলনা)',
      category: 'Infographics',
      desc: 'Starter, Standard, and Master Packages',
      badge: 'Clean',
      bg: 'luxury',
      bgColor: '#17233c',
      elements: [
        { id: crypto.randomUUID(), type: 'text', text: 'কোর্স প্যাকেজ ও সুবিধাসমূহ', color: '#fff4cf', size: 36, weight: '900', textAlign: 'center', x: 10, y: 6, w: 80, h: 9 },
        { id: crypto.randomUUID(), type: 'shape', shape: 'round', text: 'বেসিক কোর্স\n\n• থিওরি ক্লাস\n• বেসিক টিকেটিং\n• সার্টিফিকেট\n\n৳ ৫,০০০', textColor: '#ffffff', textSize: 14, textWeight: '700', textAlign: 'center', x: 10, y: 22, w: 24, h: 62, fill: '#1e293b', stroke: '#475569', line: 2, opacity: 100 },
        { id: crypto.randomUUID(), type: 'shape', shape: 'round', text: 'প্রফেশনাল কোর্স\n\n• ফুল হ্যান্ডস-অন\n• জিডিএস সাব আইডি\n• রিফান্ড/রিইস্যু ল্যাব\n• লাইভ সাপোর্ট\n\n৳ ১২,০০০', textColor: '#ffffff', textSize: 14, textWeight: '800', textAlign: 'center', x: 38, y: 19, w: 24, h: 68, fill: '#854d0e', stroke: '#ffd166', line: 3, opacity: 100 },
        { id: crypto.randomUUID(), type: 'shape', shape: 'round', text: 'মাস্টার কোর্স\n\n• এভিয়েশন ফুল ট্রেনিং\n• ট্রাভেল এজেন্সি সেটআপ\n• লাইফটাইম মেন্টরশিপ\n• পোর্টফোলিও বিল্ডিং\n\n৳ ২০,০০০', textColor: '#ffffff', textSize: 14, textWeight: '700', textAlign: 'center', x: 66, y: 22, w: 24, h: 62, fill: '#1e293b', stroke: '#475569', line: 2, opacity: 100 }
      ]
    },
    {
      id: 'fashion-lookbook',
      name: 'Fashion Lookbook (প্রোডাক্ট শোকেস)',
      category: 'Infographics',
      desc: 'Modern luxury product showcase with price badge, details & CTA',
      badge: '★ Hot',
      bg: 'fashion',
      bgColor: '#0b1120',
      elements: [
        { id: crypto.randomUUID(), type: 'shape', shape: 'round', text: '📸\n\n[ Double-click or upload\nproduct image here ]', textColor: '#94a3b8', textSize: 16, textWeight: '700', textAlign: 'center', x: 7, y: 12, w: 42, h: 76, fill: '#1e293b', stroke: '#38bdf8', line: 2, opacity: 100 },
        { id: crypto.randomUUID(), type: 'shape', shape: 'round', text: '🔥 NEW ARRIVAL', textColor: '#ffffff', textSize: 13, textWeight: '900', textAlign: 'center', x: 10, y: 16, w: 22, h: 7, fill: '#ef4444', stroke: '#fca5a5', line: 1.5, opacity: 100 },
        { id: crypto.randomUUID(), type: 'shape', shape: 'round', text: '৳ ১,৯৫০ /-', textColor: '#0f172a', textSize: 20, textWeight: '900', textAlign: 'center', x: 19, y: 72, w: 18, h: 10, fill: '#facc15', stroke: '#ffffff', line: 2, opacity: 100 },
        { id: crypto.randomUUID(), type: 'text', text: 'EXCLUSIVELY CRAFTED', color: '#38bdf8', size: 15, weight: '900', textAlign: 'left', x: 53, y: 14, w: 42, h: 5 },
        { id: crypto.randomUUID(), type: 'text', text: 'প্রিমিয়াম লাক্সারি কালেকশন', color: '#ffffff', size: 36, weight: '900', textAlign: 'left', x: 53, y: 20, w: 42, h: 10 },
        { id: crypto.randomUUID(), type: 'text', text: '১০০% পিওর কটন ফেব্রিক এবং আধুনিক ট্রেন্ডি ডিজাইনের নিখুঁত সমন্বয়। ক্যাজুয়াল ও পার্টি ওয়্যার হিসেবে অত্যন্ত আরামদায়ক।', color: '#cbd5e1', size: 16, weight: '500', textAlign: 'left', x: 53, y: 32, w: 42, h: 14 },
        { id: crypto.randomUUID(), type: 'shape', shape: 'round', text: '✓ প্রিমিয়াম কোয়ালিটি ফেব্রিক', textColor: '#ffffff', textSize: 13, textWeight: '700', textAlign: 'left', x: 53, y: 48, w: 40, h: 7, fill: '#1e293b', stroke: '#475569', line: 1, opacity: 100 },
        { id: crypto.randomUUID(), type: 'shape', shape: 'round', text: '✓ কালার গ্যারান্টি ও প্রি-শ্রাঙ্ক', textColor: '#ffffff', textSize: 13, textWeight: '700', textAlign: 'left', x: 53, y: 57, w: 40, h: 7, fill: '#1e293b', stroke: '#475569', line: 1, opacity: 100 },
        { id: crypto.randomUUID(), type: 'shape', shape: 'round', text: '✓ ক্যাশ অন ডেলিভারি সুবিধা', textColor: '#ffffff', textSize: 13, textWeight: '700', textAlign: 'left', x: 53, y: 66, w: 40, h: 7, fill: '#1e293b', stroke: '#475569', line: 1, opacity: 100 },
        { id: crypto.randomUUID(), type: 'shape', shape: 'round', text: 'অর্ডার করতে ইনবক্স করুন 🛍️', textColor: '#ffffff', textSize: 17, textWeight: '900', textAlign: 'center', x: 53, y: 76, w: 32, h: 11, fill: '#059669', stroke: '#34d399', line: 2, opacity: 100 }
      ]
    },
    {
      id: 'two-column-split',
      name: '2-Column Feature Split (দ্বিমুখী ফিচার)',
      category: 'Infographics',
      desc: 'Bold hero statement on left with structured feature points on right',
      badge: 'Modern',
      bg: 'custom',
      bgColor: '#0f172a',
      elements: [
        { id: crypto.randomUUID(), type: 'shape', shape: 'round', text: 'কেন আমাদের\nপছন্দ করবেন?\n\nআমরা প্রদান করি সর্বোচ্চ মানসম্পন্ন সার্ভিস ও দীর্ঘমেয়াদী নির্ভরযোগ্য সাপোর্ট।', textColor: '#ffffff', textSize: 22, textWeight: '900', textAlign: 'center', x: 6, y: 12, w: 40, h: 76, fill: '#1e3a8a', stroke: '#60a5fa', line: 2.5, opacity: 100 },
        { id: crypto.randomUUID(), type: 'shape', shape: 'round', text: '⭐ ১০০% বিশ্বস্ত', textColor: '#ffffff', textSize: 13, textWeight: '800', textAlign: 'center', x: 15, y: 76, w: 22, h: 8, fill: '#f59e0b', stroke: '#fde68a', line: 1.5, opacity: 100 },
        { id: crypto.randomUUID(), type: 'shape', shape: 'round', text: '১. দ্রুততম প্রসেসিং ও ডেলিভারি\nঅর্ডার কনফার্মেশনের ২৪-৪৮ ঘণ্টার মধ্যে নিরাপদে ডেলিভারি সম্পন্ন।', textColor: '#ffffff', textSize: 14, textWeight: '700', textAlign: 'left', x: 50, y: 12, w: 44, h: 22, fill: '#1e293b', stroke: '#334155', line: 1.5, opacity: 100 },
        { id: crypto.randomUUID(), type: 'shape', shape: 'round', text: '২. দক্ষ এক্সপার্টদের সার্বক্ষণিক গাইড\nযেকোনো প্রয়োজনে আমাদের ডেডিকেটেড টিম আপনার পাশে আছে।', textColor: '#ffffff', textSize: 14, textWeight: '700', textAlign: 'left', x: 50, y: 39, w: 44, h: 22, fill: '#1e293b', stroke: '#334155', line: 1.5, opacity: 100 },
        { id: crypto.randomUUID(), type: 'shape', shape: 'round', text: '৩. সহজ পেমেন্ট ও রিটার্ন পলিসি\nসব ধরনের ডিজিটাল পেমেন্ট এবং সহজ রিটার্ন সুবিধা।', textColor: '#ffffff', textSize: 14, textWeight: '700', textAlign: 'left', x: 50, y: 66, w: 44, h: 22, fill: '#1e293b', stroke: '#334155', line: 1.5, opacity: 100 }
      ]
    },
    {
      id: 'three-card-services',
      name: '3-Card Service Grid (সার্ভিস গ্রিড)',
      category: 'Infographics',
      desc: '3 elevated service cards with titles, feature points & callouts',
      badge: 'Popular',
      bg: 'ocean',
      bgColor: '#0b192c',
      elements: [
        { id: crypto.randomUUID(), type: 'text', text: 'আমাদের প্রধান সেবাসমূহ', color: '#38bdf8', size: 36, weight: '900', textAlign: 'center', x: 10, y: 6, w: 80, h: 9 },
        { id: crypto.randomUUID(), type: 'text', text: 'আপনার ব্যবসার প্রসারে সম্পূর্ণ সমাধান এক ঠিকানায়', color: '#94a3b8', size: 16, weight: '600', textAlign: 'center', x: 10, y: 15, w: 80, h: 6 },
        { id: crypto.randomUUID(), type: 'shape', shape: 'round', text: '💎 কোয়ালিটি ডিজাইন\n\n• আধুনিক লেআউট\n• প্রফেশনাল ব্রান্ডিং\n• ইউনিক স্টাইল গাইড\n\nপ্যাকেজ শুরু ৳ ৩,০০০', textColor: '#ffffff', textSize: 14, textWeight: '700', textAlign: 'center', x: 7, y: 24, w: 26, h: 64, fill: '#1e293b', stroke: '#38bdf8', line: 2, opacity: 100 },
        { id: crypto.randomUUID(), type: 'shape', shape: 'round', text: '🚀 ডিজিটাল মার্কেটিং\n\n• টার্গেটেড ফেসবুক বুস্ট\n• কনটেন্ট স্ট্র্যাটেজি\n• সেলস ফানেল অপ্টিমাইজ\n\nপ্যাকেজ শুরু ৳ ৫,০০০', textColor: '#ffffff', textSize: 14, textWeight: '800', textAlign: 'center', x: 37, y: 22, w: 26, h: 68, fill: '#1e3a8a', stroke: '#ffd166', line: 3, opacity: 100 },
        { id: crypto.randomUUID(), type: 'shape', shape: 'round', text: '🛡️ ২৪/৭ সাপোর্ট\n\n• ডেডিকেটেড ম্যানেজার\n• ইনস্ট্যান্ট চ্যাট হেল্প\n• উইকলি পারফর্মেন্স রিপোর্ট\n\nপ্যাকেজ শুরু ৳ ৪,০০০', textColor: '#ffffff', textSize: 14, textWeight: '700', textAlign: 'center', x: 67, y: 24, w: 26, h: 64, fill: '#1e293b', stroke: '#34d399', line: 2, opacity: 100 }
      ]
    },
    {
      id: 'stats-trust-grid',
      name: 'Stats & Trust Metrics (সাফল্যের পরিসংখ্যান)',
      category: 'Infographics',
      desc: '4 bold achievement metric cards with trust indicator statement',
      badge: '★ Trust',
      bg: 'custom',
      bgColor: '#060d17',
      elements: [
        { id: crypto.randomUUID(), type: 'text', text: 'আমাদের অর্জিত সাফল্য ও কাস্টমার ট্রাস্ট', color: '#facc15', size: 34, weight: '900', textAlign: 'center', x: 10, y: 8, w: 80, h: 9 },
        { id: crypto.randomUUID(), type: 'shape', shape: 'round', text: '৫০,০০০+\nসন্তুষ্ট কাস্টমার', textColor: '#ffffff', textSize: 18, textWeight: '900', textAlign: 'center', x: 6, y: 24, w: 20, h: 36, fill: '#0f2942', stroke: '#38bdf8', line: 2, opacity: 100 },
        { id: crypto.randomUUID(), type: 'shape', shape: 'round', text: '১০০%\nঅরিজিনাল গ্যারান্টি', textColor: '#ffffff', textSize: 18, textWeight: '900', textAlign: 'center', x: 29, y: 24, w: 20, h: 36, fill: '#133527', stroke: '#34d399', line: 2, opacity: 100 },
        { id: crypto.randomUUID(), type: 'shape', shape: 'round', text: '২৪ ঘণ্টা\nসুপারফাস্ট ডেলিভারি', textColor: '#ffffff', textSize: 18, textWeight: '900', textAlign: 'center', x: 52, y: 24, w: 20, h: 36, fill: '#3d2514', stroke: '#fb923c', line: 2, opacity: 100 },
        { id: crypto.randomUUID(), type: 'shape', shape: 'round', text: '৪.৯ ★\n৫-স্টার রিভিউ রেটিং', textColor: '#ffffff', textSize: 18, textWeight: '900', textAlign: 'center', x: 74, y: 24, w: 20, h: 36, fill: '#311b42', stroke: '#c084fc', line: 2, opacity: 100 },
        { id: crypto.randomUUID(), type: 'shape', shape: 'round', text: '🔒 মানসম্মত পণ্য ও নির্ভরযোগ্য সেবার প্রতিশ্রুতি সহ আমরা আছি আপনার পাশে। যোগাযোগ করুন: 01XXXXXXXXX', textColor: '#e2e8f0', textSize: 15, textWeight: '700', textAlign: 'center', x: 12, y: 68, w: 76, h: 14, fill: '#1e293b', stroke: '#475569', line: 1.5, opacity: 100 }
      ]
    }
  ];

  const standardLayouts = [
    ['title', 'Title Slide', 'Hero banner with main title and subtitle'],
    ['content', 'Title + Content', 'Header with bulleted content area'],
    ['section', 'Section Header', 'Clean divider slide for major sections'],
    ['columns', 'Two Columns', 'Two-column text layout side-by-side'],
    ['compare', 'Comparison', 'Side-by-side comparison layout'],
    ['blank', 'Blank Slide', 'Clean empty canvas']
  ];

  const masterThemes = [
    ['fashion', 'Fashion Dark'],
    ['luxury', 'Luxury Gold'],
    ['ocean', 'Ocean Blue'],
    ['clean', 'Clean White']
  ];

  document.head.insertAdjacentHTML('beforeend', `
    <style>
      .layout-gallery {
        position: fixed;
        z-index: 120;
        left: 50%;
        top: 65px;
        transform: translateX(-50%);
        width: min(840px, calc(100vw - 30px));
        max-height: calc(100vh - 90px);
        overflow-y: auto;
        padding: 18px 20px;
        background: #0f172a;
        border: 1px solid #334155;
        border-radius: 14px;
        box-shadow: 0 28px 80px rgba(0,0,0,0.85);
        font-family: inherit;
        color: #edf2f7;
      }
      .layout-head {
        display: flex;
        align-items: center;
        margin-bottom: 12px;
        padding-bottom: 10px;
        border-bottom: 1px solid #1e293b;
      }
      .layout-head strong {
        font-size: 16px;
        color: #ffd166;
      }
      .layout-tabs {
        display: flex;
        gap: 8px;
        margin-bottom: 14px;
      }
      .layout-tab-btn {
        background: #1e293b;
        border: 1px solid #334155;
        color: #94a3b8;
        padding: 6px 14px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .layout-tab-btn.active, .layout-tab-btn:hover {
        background: #2563eb;
        border-color: #60a5fa;
        color: #ffffff;
      }
      .template-grid-custom {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        margin-bottom: 14px;
      }
      .template-card-custom {
        background: #172238;
        border: 1px solid #293854;
        border-radius: 10px;
        padding: 12px;
        text-align: left;
        cursor: pointer;
        transition: all 0.18s ease;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .template-card-custom:hover {
        border-color: #ffb11b;
        background: #1d2c49;
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      }
      .template-badge {
        display: inline-block;
        background: #a855f7;
        color: #fff;
        font-size: 9px;
        font-weight: 800;
        padding: 2px 6px;
        border-radius: 4px;
        margin-bottom: 6px;
      }
      .template-title {
        font-size: 13px;
        font-weight: 800;
        color: #ffd17b;
        margin-bottom: 4px;
      }
      .template-desc {
        font-size: 11px;
        color: #94a3b8;
        line-height: 1.35;
      }
      .layout-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin-top: 10px;
      }
      .layout-card {
        height: 110px;
        padding: 8px;
        background: #172238;
        border: 1px solid #293854;
        border-radius: 8px;
        text-align: left;
        cursor: pointer;
      }
      .layout-card:hover {
        border-color: #ffb11b;
        background: #1d2c49;
      }
      .layout-preview {
        height: 64px;
        background: #f8fafc;
        border-radius: 4px;
        padding: 6px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .layout-preview i {
        display: block;
        background: #3b82f6;
        height: 6px;
        border-radius: 2px;
      }
      .layout-preview i.small {
        width: 55%;
        background: #94a3b8;
      }
      .layout-preview.two {
        flex-direction: row;
      }
      .layout-preview.two div {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .layout-preview.section {
        justify-content: center;
      }
      .layout-preview.blank {
        background: #ffffff;
      }
      .layout-card small {
        display: block;
        margin-top: 6px;
        font-size: 11px;
        font-weight: 700;
        color: #e2e8f0;
      }
      .master-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin-top: 10px;
      }
      .master-grid button {
        height: 38px;
        font-size: 11px;
        font-weight: 700;
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,0.2);
        color: #fff;
        text-shadow: 0 1px 2px #000;
      }
      @media(max-width: 768px) {
        .template-grid-custom, .layout-grid {
          grid-template-columns: 1fr;
        }
        .master-grid {
          grid-template-columns: 1fr 1fr;
        }
      }
    </style>
  `);

  if (!$('layoutGallery')) {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="layoutGallery" class="layout-gallery hidden">
        <div class="layout-head">
          <strong>SLIDE TEMPLATES & LAYOUTS</strong>
          <span class="hint" style="margin-left:10px">Choose a pre-designed template</span>
          <button id="closeLayouts" style="margin-left:auto;background:#334155;border:1px solid #475569">✕</button>
        </div>

        <div class="layout-tabs">
          <button class="layout-tab-btn active" id="tabInfographics">✨ Infographics & Pricing</button>
          <button class="layout-tab-btn" id="tabBasicLayouts">▦ Standard Layouts</button>
          <button class="layout-tab-btn" id="tabMasterThemes">🎨 Themes</button>
        </div>

        <div id="sectionInfographics">
          <div class="template-grid-custom" id="customTemplatesGrid"></div>
        </div>

        <div id="sectionBasicLayouts" class="hidden">
          <div class="layout-grid" id="layoutGrid"></div>
        </div>

        <div id="sectionMasterThemes" class="hidden">
          <div class="master-grid" id="masterGrid"></div>
        </div>
      </div>
    `);
  }

  // Populate Infographic Templates
  const customGrid = $('customTemplatesGrid');
  if (customGrid) {
    customGrid.innerHTML = '';
    customTemplates.forEach(item => {
      const card = document.createElement('div');
      card.className = 'template-card-custom';
      card.innerHTML = `
        <div>
          <span class="template-badge">${item.badge}</span>
          <div class="template-title">${item.name}</div>
          <div class="template-desc">${item.desc}</div>
        </div>
        <button style="margin-top:10px;background:#2563eb;border-color:#60a5fa;width:100%;font-size:11px">Use Template →</button>
      `;
      card.onclick = () => applyCustomTemplate(item);
      customGrid.appendChild(card);
    });
  }

  // Populate Standard Layouts
  const stdGrid = $('layoutGrid');
  if (stdGrid) {
    stdGrid.innerHTML = '';
    standardLayouts.forEach(([id, name, desc]) => {
      const b = document.createElement('button');
      b.className = 'layout-card';
      let p = '<div class="layout-preview ' + id + '">';
      if (id === 'title') p += '<i style="width:76%;margin:12px auto 0"></i><i class="small" style="margin:auto"></i>';
      else if (id === 'content') p += '<i></i><i class="small"></i><i class="small"></i><i class="small"></i>';
      else if (id === 'section') p += '<i style="width:72%;margin:auto"></i><i class="small" style="margin:auto"></i>';
      else if (id === 'columns' || id === 'compare') p += '<div><i></i><i class="small"></i><i class="small"></i></div><div><i></i><i class="small"></i><i class="small"></i></div>';
      p += '</div><small>' + name + '</small>';
      b.innerHTML = p;
      b.onclick = () => applyLayout(id);
      stdGrid.appendChild(b);
    });
  }

  // Populate Master Themes
  const mastersGrid = $('masterGrid');
  if (mastersGrid) {
    mastersGrid.innerHTML = '';
    masterThemes.forEach(([id, name]) => {
      const b = document.createElement('button');
      b.textContent = name;
      b.style.background = themes[id] || '#17233c';
      b.onclick = () => {
        active().background = id;
        render();
        $('layoutGallery')?.classList.add('hidden');
      };
      mastersGrid.appendChild(b);
    });
  }

  // Tabs switching
  $('tabInfographics')?.addEventListener('click', () => {
    $('tabInfographics').classList.add('active');
    $('tabBasicLayouts').classList.remove('active');
    $('tabMasterThemes').classList.remove('active');
    $('sectionInfographics').classList.remove('hidden');
    $('sectionBasicLayouts').classList.add('hidden');
    $('sectionMasterThemes').classList.add('hidden');
  });

  $('tabBasicLayouts')?.addEventListener('click', () => {
    $('tabBasicLayouts').classList.add('active');
    $('tabInfographics').classList.remove('active');
    $('tabMasterThemes').classList.remove('active');
    $('sectionBasicLayouts').classList.remove('hidden');
    $('sectionInfographics').classList.add('hidden');
    $('sectionMasterThemes').classList.add('hidden');
  });

  $('tabMasterThemes')?.addEventListener('click', () => {
    $('tabMasterThemes').classList.add('active');
    $('tabInfographics').classList.remove('active');
    $('tabBasicLayouts').classList.remove('active');
    $('sectionMasterThemes').classList.remove('hidden');
    $('sectionInfographics').classList.add('hidden');
    $('sectionBasicLayouts').classList.add('hidden');
  });

  function applyCustomTemplate(tmpl) {
    const s = active();
    s.background = tmpl.bg || 'custom';
    if (tmpl.bgColor) s.bgColor = tmpl.bgColor;
    s.elements = structuredClone(tmpl.elements);
    // Assign fresh UUIDs
    s.elements.forEach(e => e.id = crypto.randomUUID());
    selected = null;
    if (typeof render === 'function') render();
    $('layoutGallery')?.classList.add('hidden');
    if (typeof window.showPresentationToast === 'function') {
      window.showPresentationToast(`✓ "${tmpl.name}" template applied!`);
    }
  }

  function t(text, x, y, w, h, size, color = '#ffffff', weight = '700') {
    return { id: crypto.randomUUID(), type: 'text', text, x, y, w, h, size, color, weight };
  }

  function applyLayout(kind) {
    const s = active();
    if (kind === 'title') {
      s.elements = [
        t('Presentation Title', 12, 24, 76, 14, 58, '#ffffff', '900'),
        t('Subtitle or presenter name', 14, 45, 68, 8, 25, '#ffd166')
      ];
    } else if (kind === 'content') {
      s.elements = [
        t('Slide Title', 9, 10, 82, 10, 44, '#ffffff', '900'),
        t('Add your first point\nAdd your second point\nAdd your third point', 14, 31, 65, 38, 27, '#ffffff')
      ];
    } else if (kind === 'section') {
      s.elements = [
        t('Section Title', 12, 35, 76, 13, 58, '#ffffff', '900'),
        t('A short section description', 14, 53, 68, 8, 24, '#ffd166')
      ];
    } else if (kind === 'columns') {
      s.elements = [
        t('Slide Title', 9, 9, 82, 10, 42, '#ffffff', '900'),
        t('Left Column\nFirst point\nSecond point', 10, 29, 37, 40, 26, '#ffffff'),
        t('Right Column\nFirst point\nSecond point', 55, 29, 37, 40, 26, '#ffffff')
      ];
    } else if (kind === 'compare') {
      s.elements = [
        t('Comparison', 9, 9, 82, 10, 42, '#ffffff', '900'),
        t('Option A', 11, 27, 34, 8, 30, '#ffd166', '900'),
        t('Benefits\nDetails\nPricing', 11, 40, 34, 30, 25, '#ffffff'),
        t('Option B', 56, 27, 34, 8, 30, '#ffd166', '900'),
        t('Benefits\nDetails\nPricing', 56, 40, 34, 30, 25, '#ffffff')
      ];
    } else if (kind === 'blank') {
      s.elements = [];
    }
    selected = null;
    render();
    $('layoutGallery')?.classList.add('hidden');
  }

  if ($('templateBtn')) {
    $('templateBtn').onclick = () => $('layoutGallery')?.classList.remove('hidden');
  }
  if ($('closeLayouts')) {
    $('closeLayouts').onclick = () => $('layoutGallery')?.classList.add('hidden');
  }
})();
