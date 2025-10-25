/* ===[ NEBRAS SHIM v2 - must load first ]=============================== */
(function(){ try{
  function ensureContainer(){
    var c = document.getElementById('notificationContainer');
    if(!c){ c = document.createElement('div'); c.id='notificationContainer'; document.body.appendChild(c); }
    return c;
  }
  function toast(msg, type){
    var c = ensureContainer();
    var n = document.createElement('div');
    n.className = 'toast ' + (type||'info');
    n.dir = 'auto';
    n.textContent = String(msg||'');
    c.appendChild(n);
    setTimeout(function(){ try{ n.remove(); }catch(_){ n.parentNode && n.parentNode.removeChild(n); } }, 3000);
  }
  if (typeof window.Notification === 'function'){
    if (typeof window.Notification.show !== 'function'){
      window.Notification.show = function(msg, type){ toast(msg, type); };
    }
  } else {
    window.Notification = { show: function(msg, type){ toast(msg, type); } };
  }
} catch(_){} })();
/* ===================================================================== */

/* ===[ NEBRAS HARDENED PROLOGUE v2 ]======================================
   يسبق الشيفرة الأصلية. لا يغيّر سلوكها الوظيفي بل يمنع الأعطال الشائعة.
   - CONFIG افتراضي لتفادي Cannot access 'CONFIG' before initialization
   - onReady لتأجيل الربط حتى DOMContentLoaded
   - Dom.ensure و __nebrasSafeAppend لتفادي appendChild على null
   - Toast notifications خفيفة عند الحاجة
   - تسجيل الأخطاء ورفض الوعود في LocalStorage
=========================================================================== */
(function(){
  'use strict';
  // 0) CONFIG fallback
  if (!('CONFIG' in window)) window.CONFIG = {};
  if (!window.CONFIG.ui) window.CONFIG.ui = {};
  if (typeof window.CONFIG.ui.autoSaveInterval !== 'number') window.CONFIG.ui.autoSaveInterval = 30000;
  if (!window.CONFIG.chat) window.CONFIG.chat = { maxMemory: 524288 };

  // 1) DOM helpers
  const Dom = {
    onReady(fn){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, {once:true});
      else fn();
    },
    ensure(id, tag='div', parent=document.body, className=''){
      let el = document.getElementById(id);
      if (!el){
        el = document.createElement(tag);
        el.id = id;
        if (className) el.className = className;
        (parent || document.body || document.documentElement).appendChild(el);
      }
      return el;
    },
    safeAppend(parent, child){
      if (!parent || !('appendChild' in parent) || !child) return false;
      try{ parent.appendChild(child); return true; }catch{ return false; }
    }
  };
  window.__nebrasDom = Dom;
  window.__nebrasSafeAppend = Dom.safeAppend;

  // 2) Toast notifications
  (function(){
    if (document.getElementById('ne-toast-style')) return;
    const s = document.createElement('style');
    s.id='ne-toast-style';
    s.textContent=`.ne-toast-wrap{position:fixed;inset:auto 16px 16px auto;display:flex;flex-direction:column;gap:10px;z-index:2147483647}
    .ne-toast{padding:10px 14px;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.18);direction:rtl;max-width:360px;
    font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;color:#111827}
    .ne-i{background:#e0e7ff}.ne-s{background:#dcfce7}.ne-w{background:#fef9c3}.ne-e{background:#fee2e2}`;
    document.head.appendChild(s);
  })();
  window.NEToast = {
    show(msg,type='i',ttl=3200){
      Dom.onReady(()=>{
        const wrap = Dom.ensure('ne-toast-wrap','div',document.body,'ne-toast-wrap');
        const n = document.createElement('div');
        n.className='ne-toast ne-'+type;
        n.role='status'; n.ariaLive='polite';
        n.textContent=String(msg);
        wrap.appendChild(n);
        setTimeout(()=>{ try{ wrap.removeChild(n);}catch{} }, ttl);
      });
    },
    info(m,t){this.show(m,'i',t)}, success(m,t){this.show(m,'s',t)},
    warn(m,t){this.show(m,'w',t)}, error(m,t){this.show(m,'e',t)}
  };

  // 3) Error logging
  (function(){
    const key='ne_error_log_v2';
    if (window._ne_err_wired) return;
    window._ne_err_wired=true;
    window.addEventListener('error', (ev)=>{
      try{
        const list = JSON.parse(localStorage.getItem(key)||'[]');
        list.push({msg:String(ev.message||''),src:String(ev.filename||''),line:ev.lineno|0,col:ev.colno|0,ts:new Date().toISOString()});
        localStorage.setItem(key, JSON.stringify(list.slice(-50)));
      }catch{}
    }, true);
    window.addEventListener('unhandledrejection', (ev)=>{
      try{
        const list = JSON.parse(localStorage.getItem(key)||'[]');
        list.push({msg:String(ev.reason && ev.reason.message || ev.reason || ''),src:'promise',line:0,col:0,ts:new Date().toISOString()});
        localStorage.setItem(key, JSON.stringify(list.slice(-50)));
      }catch{}
    }, true);
  })();

  // 4) Minimal safety seeds for known IDs often used by the app
  Dom.onReady(()=>{
    ['chatMessages','imageModal','messageInput'].forEach(id=>Dom.ensure(id, id==='messageInput'?'textarea':'div'));
  });
})();


/* nebras_final.js - مدمج ومصحح ومحسن
   يحتوي جميع ملفات نبراس الاثني عشر
   تم إدراج مفتاح API بحسب طلب المستخدم
   محسن للأداء والأمان والإنتاجية
 */
(function(){
'use strict';

// Enhanced Error Classes
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

class NetworkError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'NetworkError';
    this.status = status;
  }
}

class SecurityError extends Error {
  constructor(message, type) {
    super(message);
    this.name = 'SecurityError';
    this.type = type;
  }
}

// Performance Monitor
class PerformanceMonitor {
  static measures = new Map();

  static start(label) {
    this.measures.set(label, performance.now());
  }

  static end(label) {
    const start = this.measures.get(label);
    if (start) {
      const duration = performance.now() - start;
      console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
      this.measures.delete(label);
      return duration;
    }
    return 0;
  }

  static measureExecutionTime(fn, label) {
    this.start(label);
    try {
      return fn();
    } finally {
      this.end(label);
    }
  }
}

// Security Utilities
class SecurityUtils {
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.replace(/[<>]/g, '').trim();
  }

  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validateURL(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static encryptData(data) {
    // Simple XOR encryption for localStorage (not for sensitive data)
    const key = 'nebras_secure_key';
    return btoa(data.split('').map((char, i) =>
      String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length))
    ).join(''));
  }

  static decryptData(encrypted) {
    try {
      const key = 'nebras_secure_key';
      return atob(encrypted).split('').map((char, i) =>
        String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length))
      ).join('');
    } catch {
      return encrypted;
    }
  }
}

// Enhanced Logging System
class Logger {
  static levels = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  };

  static currentLevel = this.levels.INFO;

  static setLevel(level) {
    this.currentLevel = level;
  }

  static debug(message, ...args) {
    if (this.currentLevel <= this.levels.DEBUG) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  static info(message, ...args) {
    if (this.currentLevel <= this.levels.INFO) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  static warn(message, ...args) {
    if (this.currentLevel <= this.levels.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  static error(message, ...args) {
    if (this.currentLevel <= this.levels.ERROR) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }
}




/* ----- FILE: config.js ----- */

/**
 * ملف التكوين الرئيسي لمنصة نبراس
 * تطوير: SEVEN_CODE7
 */

const CONFIG = {
  // إعدادات API - محسنة للأمان
  api: {
    key: (typeof process !== 'undefined' && process.env && process.env.NEBRAS_API_KEY) || 'AIzaSyASIFHb8b011NS4lC5VxPcIPb3VEIPYwaA',
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    model: 'gemini-2.0-flash',
    maxTokens: 2000,
    temperature: 0.7,
    timeout: 30000,
    retries: 3
  },

  // إعدادات التطبيق
  app: {
    name: 'نبراس',
    version: '2.0.0',
    studio: 'SEVEN_CODE7',
    description: 'منصة التعلم الذكية المدعومة بالذكاء الاصطناعي'
  },

  // إعدادات التخزين المحلي
  storage: {
    prefix: 'nebras_',
    keys: {
      theme: 'theme',
      messages: 'messages',
      stats: 'stats',
      settings: 'settings',
      badges: 'badges',
      challenges: 'challenges',
      library: 'library',
      errorLogs: 'errorLogs'
    }
  },

  // إعدادات الواجهة - محسنة
  ui: {
    maxMessages: 50,
    typingSpeed: 30,
    animationDuration: 300,
    notificationDuration: 5000,
    autoSaveInterval: 30000,
    debounceDelay: 300,
    throttleLimit: 100,
    maxRetries: 3,
    cacheTimeout: 3600000 // 1 hour
  },

  // أوضاع التعلم
  modes: {
    learn: {
      id: 'learn',
      title: 'المعلم الافتراضي',
      icon: 'fas fa-book-open',
      systemPrompt: 'أنت معلم افتراضي ذكي ومتخصص. مهمتك شرح المفاهيم بطريقة واضحة ومبسطة مع أمثلة عملية. استخدم أسلوباً تفاعلياً وشجع الطالب على التفكير النقدي.'
    },
    examples: {
      id: 'examples',
      title: 'مولد الأمثلة',
      icon: 'fas fa-lightbulb',
      systemPrompt: 'أنت مولد أمثلة إبداعي. قدم أمثلة متنوعة وواقعية لأي مفهوم يطلبه المستخدم. اجعل الأمثلة سهلة الفهم ومرتبطة بالحياة اليومية.'
    },
    practice: {
      id: 'practice',
      title: 'التدريب والاختبار',
      icon: 'fas fa-pen',
      systemPrompt: 'أنت مدرب ومقيّم. قدم تمارين وأسئلة متدرجة الصعوبة، وقيّم إجابات المستخدم بشكل بناء. قدم تغذية راجعة مفصلة وشجع على التحسن المستمر.'
    },
    workshop: {
      id: 'workshop',
      title: 'ورشة العمل',
      icon: 'fas fa-flask',
      systemPrompt: 'أنت مرشد ورشة عمل عملية. ساعد المستخدم على تطبيق المعرفة من خلال مشاريع وتجارب عملية. قدم إرشادات خطوة بخطوة وحلول للمشاكل.'
    },
    planner: {
      id: 'planner',
      title: 'المخطط الدراسي',
      icon: 'fas fa-calendar-alt',
      systemPrompt: 'أنت مخطط دراسي ذكي. ساعد المستخدم على تنظيم وقته وإنشاء خطط دراسية فعالة. قدم نصائح حول إدارة الوقت والتحفيز الذاتي.'
    },
    lab: {
      id: 'lab',
      title: 'المختبر البرمجي',
      icon: 'fas fa-code',
      systemPrompt: 'أنت مساعد برمجة خبير. ساعد المستخدم في كتابة وفهم الأكواد البرمجية. اشرح المفاهيم البرمجية بوضوح وقدم أمثلة عملية قابلة للتنفيذ.'
    },
    library: {
      id: 'library',
      title: 'المكتبة التعليمية',
      icon: 'fas fa-book',
      systemPrompt: 'أنت أمين مكتبة معرفية. قدم معلومات موثوقة ومنظمة حول مختلف المواضيع. استخدم مصادر متعددة واشرح المفاهيم بعمق.'
    },
    challenges: {
      id: 'challenges',
      title: 'التحديات اليومية',
      icon: 'fas fa-trophy',
      systemPrompt: 'أنت منشئ تحديات تعليمية. قدم تحديات ممتعة ومحفزة تناسب مستوى المستخدم. اجعل التحديات متنوعة وتغطي مجالات مختلفة.'
    },
    analytics: {
      id: 'analytics',
      title: 'الإحصائيات المتقدمة',
      icon: 'fas fa-chart-bar',
      systemPrompt: 'أنت محلل بيانات تعليمية. ساعد المستخدم على فهم تقدمه من خلال تحليل إحصائياته. قدم رؤى قيمة ونصائح للتحسين.'
    }
  },

  // إعدادات الشارات
  badges: [
    { id: 'beginner', name: 'المبتدئ', icon: '🌟', requirement: 0 },
    { id: 'learner', name: 'المتعلم', icon: '📚', requirement: 10 },
    { id: 'explorer', name: 'المستكشف', icon: '🔍', requirement: 25 },
    { id: 'scholar', name: 'الباحث', icon: '🎓', requirement: 50 },
    { id: 'expert', name: 'الخبير', icon: '💡', requirement: 100 },
    { id: 'master', name: 'الماهر', icon: '🏆', requirement: 200 },
    { id: 'genius', name: 'العبقري', icon: '🧠', requirement: 500 },
    { id: 'legend', name: 'الأسطورة', icon: '👑', requirement: 1000 }
  ],

  // المكتبة التعليمية - محتوى افتراضي
  libraryContent: [
    {
      id: 'intro-ai',
      title: 'مقدمة في الذكاء الاصطناعي',
      icon: '🤖',
      category: 'تقنية',
      description: 'تعرف على أساسيات الذكاء الاصطناعي وتطبيقاته في الحياة اليومية',
      content: `الذكاء الاصطناعي هو فرع من علوم الحاسوب يهدف إلى إنشاء أنظمة قادرة على محاكاة الذكاء البشري...`,
      readTime: '5 دقائق',
      difficulty: 'مبتدئ'
    },
    {
      id: 'programming-basics',
      title: 'أساسيات البرمجة',
      icon: '💻',
      category: 'برمجة',
      description: 'ابدأ رحلتك في عالم البرمجة من الصفر',
      content: `البرمجة هي عملية كتابة تعليمات للحاسوب لتنفيذ مهام معينة...`,
      readTime: '10 دقائق',
      difficulty: 'مبتدئ'
    },
    {
      id: 'math-algebra',
      title: 'الجبر الأساسي',
      icon: '🔢',
      category: 'رياضيات',
      description: 'فهم المعادلات والمتغيرات الجبرية',
      content: `الجبر هو فرع من الرياضيات يتعامل مع الرموز والقواعد لمعالجة هذه الرموز...`,
      readTime: '8 دقائق',
      difficulty: 'متوسط'
    },
    {
      id: 'physics-motion',
      title: 'الحركة والقوة',
      icon: '⚡',
      category: 'فيزياء',
      description: 'استكشف قوانين نيوتن للحركة',
      content: `قوانين نيوتن الثلاثة هي أساس الميكانيكا الكلاسيكية...`,
      readTime: '7 دقائق',
      difficulty: 'متوسط'
    },
    {
      id: 'chemistry-atoms',
      title: 'الذرات والجزيئات',
      icon: '⚗️',
      category: 'كيمياء',
      description: 'تعرف على البنية الأساسية للمادة',
      content: `الذرة هي أصغر وحدة من العنصر الكيميائي التي تحتفظ بخصائصه...`,
      readTime: '6 دقائق',
      difficulty: 'مبتدئ'
    },
    {
      id: 'biology-cells',
      title: 'الخلايا الحية',
      icon: '🧬',
      category: 'أحياء',
      description: 'اكتشف وحدة البناء الأساسية للحياة',
      content: `الخلية هي الوحدة الأساسية للحياة في جميع الكائنات الحية...`,
      readTime: '9 دقائق',
      difficulty: 'مبتدئ'
    }
  ],

  // التحديات اليومية - محتوى افتراضي
  dailyChallenges: [
    {
      id: 'math-challenge-1',
      title: 'تحدي الحساب السريع',
      category: 'رياضيات',
      difficulty: 'easy',
      description: 'احسب نتيجة: 25 × 4 + 18 ÷ 2 = ؟',
      answer: '109',
      points: 10,
      hint: 'ابدأ بالضرب والقسمة أولاً، ثم اجمع النتائج'
    },
    {
      id: 'logic-challenge-1',
      title: 'تحدي المنطق',
      category: 'منطق',
      difficulty: 'medium',
      description: 'إذا كان كل القطط حيوانات، وبعض الحيوانات تطير، هل يمكن أن تطير بعض القطط؟',
      answer: 'لا',
      points: 20,
      hint: 'فكر في الخصائص المشتركة والخاصة'
    },
    {
      id: 'code-challenge-1',
      title: 'تحدي البرمجة',
      category: 'برمجة',
      difficulty: 'medium',
      description: 'اكتب دالة JavaScript تعكس ترتيب الأحرف في نص معطى',
      answer: 'function reverse(str) { return str.split("").reverse().join(""); }',
      points: 30,
      hint: 'استخدم split و reverse و join'
    },
    {
      id: 'science-challenge-1',
      title: 'تحدي العلوم',
      category: 'علوم',
      difficulty: 'easy',
      description: 'ما هو العنصر الكيميائي الأكثر وفرة في الكون؟',
      answer: 'الهيدروجين',
      points: 10,
      hint: 'إنه أخف العناصر وأبسطها'
    },
    {
      id: 'language-challenge-1',
      title: 'تحدي اللغة',
      category: 'لغة',
      difficulty: 'hard',
      description: 'أكمل المثل: "العلم في الصغر كالنقش على ..."',
      answer: 'الحجر',
      points: 15,
      hint: 'شيء يدوم طويلاً'
    }
  ],

  // الألوان المتاحة للتخصيص
  themeColors: [
    { name: 'أزرق بنفسجي', primary: '#667eea', secondary: '#764ba2' },
    { name: 'أخضر', primary: '#10b981', secondary: '#059669' },
    { name: 'أحمر', primary: '#ef4444', secondary: '#dc2626' },
    { name: 'برتقالي', primary: '#f59e0b', secondary: '#d97706' },
    { name: 'وردي', primary: '#ec4899', secondary: '#db2777' },
    { name: 'أزرق', primary: '#3b82f6', secondary: '#2563eb' },
    { name: 'بنفسجي', primary: '#8b5cf6', secondary: '#7c3aed' }
  ]
};

// تجميد الكائن لمنع التعديل
Object.freeze(CONFIG);



/* ----- END FILE: config.js ----- */



/* ----- FILE: utils.js ----- */

/**
 * وظائف مساعدة عامة
 * تطوير: SEVEN_CODE7
 */

const Utils = {
  // Cache for DOM elements
  _elementCache: new Map(),

  /**
   * الحصول على عنصر DOM مع التخزين المؤقت
   */
  getElement(selector) {
    if (!this._elementCache.has(selector)) {
      this._elementCache.set(selector, document.querySelector(selector));
    }
    return this._elementCache.get(selector);
  },

  /**
   * مسح ذاكرة التخزين المؤقت للعناصر
   */
  clearElementCache() {
    this._elementCache.clear();
  },

  /**
   * تنسيق الوقت - محسن
   */
  formatTime(seconds) {
    if (typeof seconds !== 'number' || seconds < 0 || !isFinite(seconds)) {
      Logger.warn('Invalid seconds value for formatTime:', seconds);
      return '00:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },

  /**
   * تنسيق التاريخ
   */
  formatDate(date) {
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(date).toLocaleDateString('ar-SA', options);
  },

  /**
   * تنسيق التاريخ القصير
   */
  formatShortDate(date) {
    const now = new Date();
    const messageDate = new Date(date);
    const diffMs = now - messageDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    return messageDate.toLocaleDateString('ar-SA');
  },

  /**
   * تحويل الصورة إلى Base64
   */
  async imageToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  /**
   * ضغط الصورة
   */
  async compressImage(file, maxWidth = 800, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            resolve(blob);
          }, 'image/jpeg', quality);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  /**
   * تنظيف النص من HTML
   */
  sanitizeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * تحويل Markdown إلى HTML بسيط
   */
  markdownToHTML(text) {
    // عناوين
    text = text.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    text = text.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    text = text.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // نص عريض
    text = text.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
    
    // نص مائل
    text = text.replace(/\*(.*?)\*/gim, '<em>$1</em>');
    
    // كود مضمن
    text = text.replace(/`(.*?)`/gim, '<code>$1</code>');
    
    // كود متعدد الأسطر
    text = text.replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>');
    
    // روابط
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank">$1</a>');
    
    // قوائم
    text = text.replace(/^\* (.*$)/gim, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // أسطر جديدة
    text = text.replace(/\n/gim, '<br>');
    
    return text;
  },

  /**
   * نسخ النص إلى الحافظة
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fallback للمتصفحات القديمة
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  },

  /**
   * توليد معرف فريد
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  /**
   * خلط عناصر المصفوفة
   */
  shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  },

  /**
   * تأخير التنفيذ
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Debounce للوظائف
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Throttle للوظائف
   */
  throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * التحقق من صحة البريد الإلكتروني - محسن
   */
  isValidEmail(email) {
    if (typeof email !== 'string') return false;
    return SecurityUtils.validateEmail(email);
  },

  /**
   * التحقق من صحة URL - محسن
   */
  isValidURL(url) {
    if (typeof url !== 'string') return false;
    return SecurityUtils.validateURL(url);
  },

  /**
   * تقصير النص
   */
  truncateText(text, maxLength, suffix = '...') {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength - suffix.length) + suffix;
  },

  /**
   * تحويل الأرقام إلى صيغة قابلة للقراءة
   */
  formatNumber(num) {
    if (typeof num !== 'number' || !isFinite(num)) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'م';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'ك';
    return num.toString();
  },

  /**
   * حساب النسبة المئوية
   */
  calculatePercentage(value, total) {
    if (typeof value !== 'number' || typeof total !== 'number' || total === 0 || !isFinite(value) || !isFinite(total)) {
      return 0;
    }
    return Math.round((value / total) * 100);
  },

  /**
   * الحصول على لون عشوائي
   */
  getRandomColor() {
    const colors = CONFIG.themeColors;
    return colors[Math.floor(Math.random() * colors.length)];
  },

  /**
   * تحويل RGB إلى Hex
   */
  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  },

  /**
   * تحويل Hex إلى RGB
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  },

  /**
   * تفتيح اللون
   */
  lightenColor(hex, percent) {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return hex;
    
    const increase = (value) => Math.min(255, Math.floor(value + (255 - value) * percent / 100));
    
    return this.rgbToHex(
      increase(rgb.r),
      increase(rgb.g),
      increase(rgb.b)
    );
  },

  /**
   * تغميق اللون
   */
  darkenColor(hex, percent) {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return hex;
    
    const decrease = (value) => Math.max(0, Math.floor(value * (1 - percent / 100)));
    
    return this.rgbToHex(
      decrease(rgb.r),
      decrease(rgb.g),
      decrease(rgb.b)
    );
  },

  /**
   * الكشف عن الجهاز المحمول
   */
  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },

  /**
   * الكشف عن الوضع الداكن للنظام
   */
  isSystemDarkMode() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  },

  /**
   * تشغيل صوت
   */
  playSound(frequency = 440, duration = 200, type = 'sine') {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (err) {
      console.warn('تعذر تشغيل الصوت:', err);
    }
  },

  /**
   * اهتزاز الجهاز
   */
  vibrate(pattern = 200) {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  },

  /**
   * طلب إذن الإشعارات
   */
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    
    return false;
  },

  /**
   * إرسال إشعار
   */
  async sendNotification(title, options = {}) {
    const hasPermission = await this.requestNotificationPermission();
    
    if (hasPermission) {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });
      
      return notification;
    }
    
    return null;
  },

  /**
   * تحميل ملف
   */
  downloadFile(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * تحميل JSON
   */
  downloadJSON(data, filename) {
    const json = JSON.stringify(data, null, 2);
    this.downloadFile(json, filename, 'application/json');
  },

  /**
   * قراءة ملف
   */
  async readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  },

  /**
   * التمرير السلس إلى عنصر
   */
  smoothScrollTo(element, offset = 0) {
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  },

  /**
   * التحقق من ظهور العنصر في الشاشة
   */
  isElementInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  },

  /**
   * الحصول على معلومات المتصفح
   */
  getBrowserInfo() {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    
    if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
    else if (ua.indexOf('Chrome') > -1) browser = 'Chrome';
    else if (ua.indexOf('Safari') > -1) browser = 'Safari';
    else if (ua.indexOf('Edge') > -1) browser = 'Edge';
    else if (ua.indexOf('MSIE') > -1 || ua.indexOf('Trident/') > -1) browser = 'IE';
    
    return {
      browser,
      userAgent: ua,
      platform: navigator.platform,
      language: navigator.language
    };
  },

  /**
   * معالجة الأخطاء بشكل آمن
   */
  safeExecute(func, fallback = null) {
    try {
      return func();
    } catch (err) {
      console.error('خطأ في التنفيذ:', err);
      return fallback;
    }
  },

  /**
   * معالجة الأخطاء غير المتزامنة بشكل آمن
   */
  async safeExecuteAsync(func, fallback = null) {
    try {
      return await func();
    } catch (err) {
      console.error('خطأ في التنفيذ غير المتزامن:', err);
      return fallback;
    }
  }
};

// تجميد الكائن
Object.freeze(Utils);



/* ----- END FILE: utils.js ----- */



/* ----- FILE: storage.js ----- */

/**
 * إدارة التخزين المحلي
 * تطوير: SEVEN_CODE7
 */

const Storage = {
  // Cache for storage operations
  _cache: new Map(),
  _cacheTimeout: CONFIG.ui.cacheTimeout,

  /**
   * الحصول على مفتاح كامل - محسن
   */
  getKey(key) {
    if (typeof key !== 'string' || !key.trim()) {
      throw new ValidationError('Invalid storage key', 'key');
    }
    return CONFIG.storage.prefix + SecurityUtils.sanitizeInput(key);
  },

  /**
   * حفظ بيانات - محسن مع التشفير والتحقق
   */
  set(key, value) {
    PerformanceMonitor.start(`storage_set_${key}`);
    try {
      const fullKey = this.getKey(key);
      const data = SecurityUtils.encryptData(JSON.stringify(value));
      localStorage.setItem(fullKey, data);

      // Update cache
      this._cache.set(fullKey, {
        data: value,
        timestamp: Date.now()
      });

      Logger.debug(`Data saved successfully for key: ${key}`);
      return true;
    } catch (err) {
      Logger.error('خطأ في حفظ البيانات:', err);
      if (err.name === 'QuotaExceededError') {
        throw new Error('تجاوز حد التخزين المحلي');
      }
      return false;
    } finally {
      PerformanceMonitor.end(`storage_set_${key}`);
    }
  },

  /**
   * الحصول على بيانات - محسن مع التخزين المؤقت
   */
  get(key, defaultValue = null) {
    PerformanceMonitor.start(`storage_get_${key}`);
    try {
      const fullKey = this.getKey(key);

      // Check cache first
      const cached = this._cache.get(fullKey);
      if (cached && (Date.now() - cached.timestamp) < this._cacheTimeout) {
        Logger.debug(`Cache hit for key: ${key}`);
        return cached.data;
      }

      const encryptedData = localStorage.getItem(fullKey);
      if (!encryptedData) return defaultValue;

      const data = JSON.parse(SecurityUtils.decryptData(encryptedData));

      // Update cache
      this._cache.set(fullKey, {
        data,
        timestamp: Date.now()
      });

      Logger.debug(`Data retrieved successfully for key: ${key}`);
      return data;
    } catch (err) {
      Logger.error('خطأ في قراءة البيانات:', err);
      return defaultValue;
    } finally {
      PerformanceMonitor.end(`storage_get_${key}`);
    }
  },

  /**
   * حذف بيانات
   */
  remove(key) {
    try {
      const fullKey = this.getKey(key);
      localStorage.removeItem(fullKey);
      return true;
    } catch (err) {
      console.error('خطأ في حذف البيانات:', err);
      return false;
    }
  },

  /**
   * مسح جميع البيانات
   */
  clear() {
    try {
      const keys = Object.keys(localStorage);
      const prefix = CONFIG.storage.prefix;
      
      keys.forEach(key => {
        if (key.startsWith(prefix)) {
          localStorage.removeItem(key);
        }
      });
      
      return true;
    } catch (err) {
      console.error('خطأ في مسح البيانات:', err);
      return false;
    }
  },

  /**
   * التحقق من وجود مفتاح
   */
  has(key) {
    const fullKey = this.getKey(key);
    return localStorage.getItem(fullKey) !== null;
  },

  /**
   * الحصول على حجم التخزين المستخدم
   */
  getSize() {
    let size = 0;
    const keys = Object.keys(localStorage);
    const prefix = CONFIG.storage.prefix;
    keys.forEach(key => {
      if (key.startsWith(prefix)) {
        const item = localStorage.getItem(key);
        if (item) size += item.length + key.length;
      }
    });
    return size;
  },

  /**
   * الحصول على حجم التخزين المتاح
   */
  getAvailableSize() {
    const maxSize = 5 * 1024 * 1024; // 5MB تقريباً
    return maxSize - this.getSize();
  },

  /**
   * حفظ الرسائل
   */
  saveMessages(messages) {
    // حفظ آخر 50 رسالة فقط
    const maxMessages = CONFIG.ui.maxMessages;
    const messagesToSave = messages.slice(-maxMessages);
    return this.set(CONFIG.storage.keys.messages, messagesToSave);
  },

  /**
   * الحصول على الرسائل
   */
  getMessages() {
    return this.get(CONFIG.storage.keys.messages, []);
  },

  /**
   * حفظ الإحصائيات
   */
  saveStats(stats) {
    return this.set(CONFIG.storage.keys.stats, stats);
  },

  /**
   * الحصول على الإحصائيات
   */
  getStats() {
    return this.get(CONFIG.storage.keys.stats, {
      questionsCount: 0,
      learningLevel: 1,
      pointsCount: 0,
      streakCount: 0,
      totalTime: 0,
      lastVisit: null,
      startDate: new Date().toISOString()
    });
  },

  /**
   * تحديث الإحصائيات
   */
  updateStats(updates) {
    const stats = this.getStats();
    const newStats = { ...stats, ...updates };
    return this.saveStats(newStats);
  },

  /**
   * حفظ الإعدادات
   */
  saveSettings(settings) {
    return this.set(CONFIG.storage.keys.settings, settings);
  },

  /**
   * الحصول على الإعدادات
   */
  getSettings() {
    return this.get(CONFIG.storage.keys.settings, {
      theme: 'light',
      primaryColor: '#667eea',
      fontSize: 'medium',
      notificationsEnabled: true,
      soundEnabled: true,
      detailLevel: 'medium',
      autoSave: true
    });
  },

  /**
   * تحديث الإعدادات
   */
  updateSettings(updates) {
    const settings = this.getSettings();
    const newSettings = { ...settings, ...updates };
    return this.saveSettings(newSettings);
  },

  /**
   * حفظ الشارات
   */
  saveBadges(badges) {
    return this.set(CONFIG.storage.keys.badges, badges);
  },

  /**
   * الحصول على الشارات
   */
  getBadges() {
    return this.get(CONFIG.storage.keys.badges, ['beginner']);
  },

  /**
   * إضافة شارة
   */
  addBadge(badgeId) {
    const badges = this.getBadges();
    if (!badges.includes(badgeId)) {
      badges.push(badgeId);
      this.saveBadges(badges);
      return true;
    }
    return false;
  },

  /**
   * حفظ التحديات المكتملة
   */
  saveCompletedChallenges(challenges) {
    return this.set(CONFIG.storage.keys.challenges, challenges);
  },

  /**
   * الحصول على التحديات المكتملة
   */
  getCompletedChallenges() {
    return this.get(CONFIG.storage.keys.challenges, []);
  },

  /**
   * إضافة تحدي مكتمل
   */
  addCompletedChallenge(challengeId) {
    const challenges = this.getCompletedChallenges();
    if (!challenges.includes(challengeId)) {
      challenges.push(challengeId);
      this.saveCompletedChallenges(challenges);
      return true;
    }
    return false;
  },

  /**
   * حفظ المقالات المقروءة
   */
  saveReadArticles(articles) {
    return this.set(CONFIG.storage.keys.library, articles);
  },

  /**
   * الحصول على المقالات المقروءة
   */
  getReadArticles() {
    return this.get(CONFIG.storage.keys.library, []);
  },

  /**
   * إضافة مقال مقروء
   */
  addReadArticle(articleId) {
    const articles = this.getReadArticles();
    if (!articles.includes(articleId)) {
      articles.push(articleId);
      this.saveReadArticles(articles);
      return true;
    }
    return false;
  },

  /**
   * تصدير جميع البيانات
   */
  exportAll() {
    return {
      messages: this.getMessages(),
      stats: this.getStats(),
      settings: this.getSettings(),
      badges: this.getBadges(),
      completedChallenges: this.getCompletedChallenges(),
      readArticles: this.getReadArticles(),
      exportDate: new Date().toISOString(),
      version: CONFIG.app.version
    };
  },

  /**
   * استيراد البيانات
   */
  importAll(data) {
    try {
      if (data.messages) this.saveMessages(data.messages);
      if (data.stats) this.saveStats(data.stats);
      if (data.settings) this.saveSettings(data.settings);
      if (data.badges) this.saveBadges(data.badges);
      if (data.completedChallenges) this.saveCompletedChallenges(data.completedChallenges);
      if (data.readArticles) this.saveReadArticles(data.readArticles);
      return true;
    } catch (err) {
      console.error('خطأ في استيراد البيانات:', err);
      return false;
    }
  },

  /**
   * نسخ احتياطي تلقائي
   */
  autoBackup() {
    const data = this.exportAll();
    const backupKey = 'backup_' + new Date().toISOString().split('T')[0];
    return this.set(backupKey, data);
  },

  /**
   * استعادة من نسخة احتياطية
   */
  restoreBackup(date) {
    const backupKey = 'backup_' + date;
    const data = this.get(backupKey);
    if (data) {
      return this.importAll(data);
    }
    return false;
  },

  /**
   * حذف النسخ الاحتياطية القديمة
   */
  cleanOldBackups(daysToKeep = 7) {
    const keys = Object.keys(localStorage);
    const prefix = this.getKey('backup_');
    const now = new Date();
    
    keys.forEach(key => {
      if (key.startsWith(prefix)) {
        const dateStr = key.replace(prefix, '');
        const backupDate = new Date(dateStr);
        const daysDiff = (now - backupDate) / (1000 * 60 * 60 * 24);
        
        if (daysDiff > daysToKeep) {
          localStorage.removeItem(key);
        }
      }
    });
  }
};

// تجميد الكائن
Object.freeze(Storage);



/* ----- END FILE: storage.js ----- */



/* ----- FILE: modes.js ----- */

/**
 * إدارة أوضاع التعلم
 * تطوير: SEVEN_CODE7
 */

const Modes = {
  currentMode: 'learn',

  /**
   * تهيئة الأوضاع
   */
  init() {
    this.setupEventListeners();
    this.loadCurrentMode();
  },

  /**
   * إعداد مستمعي الأحداث
   */
  setupEventListeners() {
    // تم إعداد الأحداث في HTML (onclick)
  },

  /**
   * تبديل الوضع
   */
  switchMode(modeId) {
    if (!CONFIG.modes[modeId]) {
      console.error('وضع غير موجود:', modeId);
      return;
    }

    this.currentMode = modeId;
    Chat.currentMode = modeId;
    
    this.updateUI(modeId);
    this.handleModeSpecificUI(modeId);
    
    Storage.updateSettings({ lastMode: modeId });
    Notification.show(`تم التبديل إلى: ${CONFIG.modes[modeId].title}`, 'info');
  },

  /**
   * تحديث الواجهة
   */
  updateUI(modeId) {
    const mode = CONFIG.modes[modeId];
    
    // تحديث العنوان
    const chatTitle = document.getElementById('chatTitle');
    chatTitle.innerHTML = `<i class="${mode.icon}"></i> ${mode.title}`;
    
    // تحديث العناصر النشطة في القائمة
    document.querySelectorAll('.menu .item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.mode === modeId) {
        item.classList.add('active');
      }
    });
  },

  /**
   * معالجة الواجهة الخاصة بكل وضع
   */
  handleModeSpecificUI(modeId) {
    const mainContent = document.querySelector('.main-content');
    
    // إخفاء جميع المحتويات الخاصة
    document.querySelectorAll('.mode-specific-content').forEach(el => {
      el.style.display = 'none';
    });

    // عرض المحتوى الخاص بالوضع
    switch (modeId) {
      case 'learn':
        this.showLearnMode();
        break;
      case 'examples':
        this.showExamplesMode();
        break;
      case 'practice':
        this.showPracticeMode();
        break;
      case 'workshop':
        this.showWorkshopMode();
        break;
      case 'planner':
        this.showPlannerMode();
        break;
      case 'lab':
        this.showLabMode();
        break;
      case 'library':
        this.showLibraryMode();
        break;
      case 'challenges':
        this.showChallengesMode();
        break;
      case 'analytics':
        this.showAnalyticsMode();
        break;
    }
  },

  /**
   * عرض وضع المعلم الافتراضي
   */
  showLearnMode() {
    // الوضع الافتراضي - المحادثة العادية
    const chatbox = document.getElementById('chatMessages');
    if (chatbox.children.length === 0) {
      Chat.renderMessages();
    }
  },

  /**
   * عرض وضع مولد الأمثلة
   */
  showExamplesMode() {
    const topicInputArea = document.getElementById('topicInputArea');
    topicInputArea.style.display = 'flex';
    
    const topicInput = document.getElementById('topicInput');
    topicInput.placeholder = 'أدخل موضوعاً للحصول على أمثلة...';
  },

  /**
   * عرض وضع التدريب والاختبار
   */
  showPracticeMode() {
    const topicInputArea = document.getElementById('topicInputArea');
    topicInputArea.style.display = 'flex';
    
    const topicInput = document.getElementById('topicInput');
    topicInput.placeholder = 'أدخل موضوعاً للحصول على أسئلة تدريبية...';
  },

  /**
   * عرض وضع ورشة العمل
   */
  showWorkshopMode() {
    // يمكن إضافة واجهة خاصة لورشة العمل
    Chat.renderMessages();
  },

  /**
   * عرض وضع المخطط الدراسي
   */
  showPlannerMode() {
    const topicInputArea = document.getElementById('topicInputArea');
    topicInputArea.style.display = 'flex';
    
    const topicInput = document.getElementById('topicInput');
    topicInput.placeholder = 'أدخل المادة الدراسية لإنشاء خطة...';
  },

  /**
   * عرض وضع المختبر البرمجي
   */
  showLabMode() {
    // سيتم معالجته في lab.js
    Lab.show();
  },

  /**
   * عرض وضع المكتبة التعليمية
   */
  showLibraryMode() {
    // سيتم معالجته في library.js
    Library.show();
  },

  /**
   * عرض وضع التحديات اليومية
   */
  showChallengesMode() {
    // سيتم معالجته في challenges.js
    Challenges.show();
  },

  /**
   * عرض وضع الإحصائيات المتقدمة
   */
  showAnalyticsMode() {
    // سيتم معالجته في analytics.js
    Analytics.show();
  },

  /**
   * بدء التعلم (من منطقة إدخال الموضوع)
   */
  async startLearning() {
    const topicInput = document.getElementById('topicInput');
    const topic = topicInput.value.trim();
    
    if (!topic) {
      Notification.show('يرجى إدخال موضوع', 'warning');
      return;
    }

    topicInput.value = '';
    
    let prompt = '';
    
    switch (this.currentMode) {
      case 'examples':
        prompt = `أعطني 5 أمثلة متنوعة وواضحة عن: ${topic}`;
        break;
      case 'practice':
        prompt = `أنشئ 5 أسئلة تدريبية متدرجة الصعوبة عن: ${topic}`;
        break;
      case 'planner':
        prompt = `أنشئ خطة دراسية مفصلة لمدة شهر لتعلم: ${topic}`;
        break;
      default:
        prompt = `علمني عن: ${topic}`;
    }

    const messageInput = document.getElementById('messageInput');
    messageInput.value = prompt;
    await Chat.sendMessage();
  },

  /**
   * تحميل الوضع الحالي
   */
  loadCurrentMode() {
    const settings = Storage.getSettings();
    const lastMode = settings.lastMode || 'learn';
    this.switchMode(lastMode);
  },

  /**
   * الحصول على الوضع الحالي
   */
  getCurrentMode() {
    return this.currentMode;
  },

  /**
   * الحصول على معلومات الوضع
   */
  getModeInfo(modeId) {
    return CONFIG.modes[modeId] || null;
  }
};

// وظيفة عامة للتبديل بين الأوضاع
function switchMode(modeId) {
  Modes.switchMode(modeId);
}

// وظيفة بدء التعلم
function startLearning() {
  Modes.startLearning();
}

// وظيفة تحميل محتوى SEVEN_CODE7
async function loadSevenCodeContent() {
  const message = `أخبرني عن قناة SEVEN_CODE7 على يوتيوب وما هي أنواع المحتوى التعليمي الذي تقدمه في مجال البرمجة والتقنية.`;
  
  const messageInput = document.getElementById('messageInput');
  messageInput.value = message;
  await Chat.sendMessage();
}



/* ----- END FILE: modes.js ----- */



/* ----- FILE: ai.js ----- */

/**
 * وحدة التواصل مع الذكاء الاصطناعي
 * تطوير: SEVEN_CODE7
 */


const AI = {
  // Rate limiting
  _lastRequestTime: 0,
  _requestQueue: [],

  async sendMessage(messages) {
    PerformanceMonitor.start('ai_sendMessage');

    try {
      // Rate limiting
      const now = Date.now();
      const timeSinceLastRequest = now - this._lastRequestTime;
      if (timeSinceLastRequest < 1000) { // 1 second minimum between requests
        await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastRequest));
      }
      this._lastRequestTime = Date.now();

      const url = CONFIG.api.url;
      if (!url) {
        throw new NetworkError('API URL not configured', 0);
      }

      // Validate API key
      if (!CONFIG.api.key || CONFIG.api.key === 'your-api-key-here') {
        throw new SecurityError('API key not configured', 'missing_key');
      }

      // Normalize and validate messages
      const contents = this._normalizeMessages(messages);

      const payload = {
        contents,
        generationConfig: {
          temperature: CONFIG.api.temperature ?? 0.7,
          maxOutputTokens: CONFIG.api.maxTokens ?? 1024
        }
      };

      Logger.info('Sending request to AI API');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.api.timeout);

      const res = await fetch(`${url}?key=${CONFIG.api.key}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const txt = await res.text();
        Logger.error('AI API error:', txt);
        throw new NetworkError(txt || 'API error', res.status);
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error('لم يتمكن الذكاء الاصطناعي من توليد رد.');
      }

      Logger.info('AI response received successfully');
      return { success: true, message: text.trim() };

    } catch (err) {
      Logger.error('خطأ في التواصل مع الذكاء الاصطناعي:', err);

      if (err.name === 'AbortError') {
        return { success: false, error: 'انتهت مهلة الطلب' };
      }

      if (err instanceof NetworkError || err instanceof SecurityError) {
        return { success: false, error: err.message };
      }

      return {
        success: false,
        error: err?.message || String(err)
      };
    } finally {
      PerformanceMonitor.end('ai_sendMessage');
    }
  },

  _normalizeMessages(messages) {
    if (!Array.isArray(messages)) {
      messages = [{ role: 'user', content: String(messages || '') }];
    }

    return messages.map(m => {
      if (!m || typeof m !== 'object') {
        throw new ValidationError('Invalid message format', 'messages');
      }

      let textContent = '';
      if (typeof m.content === 'string') {
        textContent = SecurityUtils.sanitizeInput(m.content);
      } else if (Array.isArray(m.content)) {
        textContent = m.content.map(part => {
          if (typeof part === 'string') return SecurityUtils.sanitizeInput(part);
          if (part && typeof part.text === 'string') return SecurityUtils.sanitizeInput(part.text);
          return '';
        }).join('\n');
      } else {
        textContent = String(m.content || '');
      }

      if (!textContent.trim()) {
        throw new ValidationError('Empty message content', 'messages');
      }

      return {
        role: m.role || 'user',
        parts: [{ text: textContent }]
      };
    });
  },
  async sendMessageWithImages(text, images, systemPrompt) {
    const content = [
      { type: 'text', text }
    ];

    // إضافة الصور
    images.forEach(image => {
      content.push({
        type: 'image_url',
        image_url: {
          url: image
        }
      });
    });

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content }
    ];

    return await this.sendMessage(messages);
  },

  /**
   * إرسال رسالة مع السياق
   */
  async sendMessageWithContext(userMessage, context, systemPrompt) {
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // إضافة السياق (الرسائل السابقة)
    context.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });

    // إضافة الرسالة الجديدة
    messages.push({
      role: 'user',
      content: userMessage
    });

    return await this.sendMessage(messages);
  },

  /**
   * توليد أمثلة
   */
  async generateExamples(topic, count = 3) {
    const prompt = `قدم ${count} أمثلة واضحة ومتنوعة عن: ${topic}. اجعل الأمثلة عملية ومرتبطة بالحياة اليومية.`;
    
    const messages = [
      { role: 'system', content: CONFIG.modes.examples.systemPrompt },
      { role: 'user', content: prompt }
    ];

    return await this.sendMessage(messages);
  },

  /**
   * توليد أسئلة تدريبية
   */
  async generatePracticeQuestions(topic, difficulty = 'medium', count = 5) {
    const difficultyText = {
      easy: 'سهلة',
      medium: 'متوسطة',
      hard: 'صعبة'
    };

    const prompt = `أنشئ ${count} أسئلة تدريبية ${difficultyText[difficulty]} عن: ${topic}. قدم الأسئلة مع إجاباتها النموذجية وشرح مختصر.`;
    
    const messages = [
      { role: 'system', content: CONFIG.modes.practice.systemPrompt },
      { role: 'user', content: prompt }
    ];

    return await this.sendMessage(messages);
  },

  /**
   * إنشاء خطة دراسية
   */
  async createStudyPlan(subject, duration, level) {
    const prompt = `أنشئ خطة دراسية مفصلة لـ ${subject} لمدة ${duration}. المستوى: ${level}. قسّم الخطة إلى أسابيع وأيام مع تحديد المواضيع والأهداف.`;
    
    const messages = [
      { role: 'system', content: CONFIG.modes.planner.systemPrompt },
      { role: 'user', content: prompt }
    ];

    return await this.sendMessage(messages);
  },

  /**
   * شرح كود برمجي
   */
  async explainCode(code, language) {
    const prompt = `اشرح هذا الكود المكتوب بلغة ${language} بشكل مفصل:\n\n\`\`\`${language}\n${code}\n\`\`\``;
    
    const messages = [
      { role: 'system', content: CONFIG.modes.lab.systemPrompt },
      { role: 'user', content: prompt }
    ];

    return await this.sendMessage(messages);
  },

  /**
   * إصلاح كود برمجي
   */
  async fixCode(code, language, error) {
    const prompt = `هذا الكود المكتوب بلغة ${language} يحتوي على خطأ:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nالخطأ: ${error}\n\nقم بإصلاح الكود واشرح المشكلة والحل.`;
    
    const messages = [
      { role: 'system', content: CONFIG.modes.lab.systemPrompt },
      { role: 'user', content: prompt }
    ];

    return await this.sendMessage(messages);
  },

  /**
   * توليد كود برمجي
   */
  async generateCode(description, language) {
    const prompt = `اكتب كود برمجي بلغة ${language} يقوم بـ: ${description}. قدم الكود مع شرح مختصر لكيفية عمله.`;
    
    const messages = [
      { role: 'system', content: CONFIG.modes.lab.systemPrompt },
      { role: 'user', content: prompt }
    ];

    return await this.sendMessage(messages);
  },

  /**
   * تحليل إجابة
   */
  async analyzeAnswer(question, userAnswer, correctAnswer) {
    const prompt = `السؤال: ${question}\n\nإجابة الطالب: ${userAnswer}\n\nالإجابة الصحيحة: ${correctAnswer}\n\nقيّم إجابة الطالب وقدم تغذية راجعة بناءة.`;
    
    const messages = [
      { role: 'system', content: CONFIG.modes.practice.systemPrompt },
      { role: 'user', content: prompt }
    ];

    return await this.sendMessage(messages);
  },

  /**
   * توليد تحدي
   */
  async generateChallenge(category, difficulty) {
    const prompt = `أنشئ تحدياً تعليمياً في مجال ${category} بمستوى صعوبة ${difficulty}. قدم التحدي مع الحل والشرح.`;
    
    const messages = [
      { role: 'system', content: CONFIG.modes.challenges.systemPrompt },
      { role: 'user', content: prompt }
    ];

    return await this.sendMessage(messages);
  },

  /**
   * تلخيص نص
   */
  async summarizeText(text, maxLength = 200) {
    const prompt = `لخص النص التالي في حوالي ${maxLength} كلمة:\n\n${text}`;
    
    const messages = [
      { role: 'system', content: 'أنت ملخص نصوص محترف. قدم ملخصات دقيقة وشاملة.' },
      { role: 'user', content: prompt }
    ];

    return await this.sendMessage(messages);
  },

  /**
   * ترجمة نص
   */
  async translateText(text, targetLanguage) {
    const prompt = `ترجم النص التالي إلى ${targetLanguage}:\n\n${text}`;
    
    const messages = [
      { role: 'system', content: 'أنت مترجم محترف. قدم ترجمات دقيقة وطبيعية.' },
      { role: 'user', content: prompt }
    ];

    return await this.sendMessage(messages);
  },

  /**
   * تحسين نص
   */
  async improveText(text, style = 'formal') {
    const styleText = {
      formal: 'رسمي',
      casual: 'غير رسمي',
      academic: 'أكاديمي',
      creative: 'إبداعي'
    };

    const prompt = `حسّن النص التالي ليكون بأسلوب ${styleText[style]}:\n\n${text}`;
    
    const messages = [
      { role: 'system', content: 'أنت محرر نصوص محترف. قدم نصوصاً محسّنة وواضحة.' },
      { role: 'user', content: prompt }
    ];

    return await this.sendMessage(messages);
  },

  /**
   * الإجابة على سؤال من سياق
   */
  async answerFromContext(question, context) {
    const prompt = `بناءً على السياق التالي:\n\n${context}\n\nأجب على السؤال: ${question}`;
    
    const messages = [
      { role: 'system', content: 'أنت مساعد ذكي يجيب على الأسئلة بناءً على السياق المعطى فقط.' },
      { role: 'user', content: prompt }
    ];

    return await this.sendMessage(messages);
  },

  /**
   * توليد أفكار إبداعية
   */
  async generateIdeas(topic, count = 5) {
    const prompt = `قدم ${count} أفكار إبداعية ومبتكرة حول: ${topic}`;
    
    const messages = [
      { role: 'system', content: 'أنت مولد أفكار إبداعي. قدم أفكاراً مبتكرة وقابلة للتطبيق.' },
      { role: 'user', content: prompt }
    ];

    return await this.sendMessage(messages);
  },

  /**
   * تحليل نقاط القوة والضعف
   */
  async analyzeSWOT(topic) {
    const prompt = `قم بتحليل SWOT (نقاط القوة، نقاط الضعف، الفرص، التهديدات) لـ: ${topic}`;
    
    const messages = [
      { role: 'system', content: 'أنت محلل استراتيجي. قدم تحليلات شاملة ومتوازنة.' },
      { role: 'user', content: prompt }
    ];

    return await this.sendMessage(messages);
  },

  /**
   * إنشاء قصة تعليمية
   */
  async createEducationalStory(concept, ageGroup) {
    const prompt = `اكتب قصة تعليمية قصيرة تشرح مفهوم ${concept} للفئة العمرية: ${ageGroup}. اجعل القصة ممتعة وسهلة الفهم.`;
    
    const messages = [
      { role: 'system', content: 'أنت كاتب قصص تعليمية. اجعل القصص ممتعة وغنية بالمعلومات.' },
      { role: 'user', content: prompt }
    ];

    return await this.sendMessage(messages);
  },

  /**
   * تقييم التقدم
   */
  async evaluateProgress(stats) {
    const prompt = `بناءً على الإحصائيات التالية:\n- عدد الأسئلة: ${stats.questionsCount}\n- المستوى: ${stats.learningLevel}\n- النقاط: ${stats.pointsCount}\n- السلسلة: ${stats.streakCount} يوم\n\nقدم تقييماً للتقدم ونصائح للتحسين.`;
    
    const messages = [
      { role: 'system', content: CONFIG.modes.analytics.systemPrompt },
      { role: 'user', content: prompt }
    ];

    return await this.sendMessage(messages);
  },

  /**
   * ضغط السياق (للذاكرة)
   */
  async compressContext(messages) {
    const conversation = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    const prompt = `لخص المحادثة التالية في نقاط رئيسية:\n\n${conversation}`;
    
    const systemMessages = [
      { role: 'system', content: 'أنت ملخص محادثات. قدم ملخصات موجزة تحتفظ بالمعلومات المهمة.' },
      { role: 'user', content: prompt }
    ];

    return await this.sendMessage(systemMessages);
  }
};

// تجميد الكائن
Object.freeze(AI);



/* ----- END FILE: ai.js ----- */



/* ----- FILE: lab.js ----- */

/**
 * المختبر البرمجي
 * تطوير: SEVEN_CODE7
 */

const Lab = {
  editor: null,
  currentLanguage: 'javascript',

  /**
   * عرض المختبر البرمجي
   */
  show() {
    const chatbox = document.getElementById('chatMessages');
    chatbox.innerHTML = this.getLabHTML();
    
    setTimeout(() => {
      this.initEditor();
      this.setupEventListeners();
    }, 100);
  },

  /**
   * الحصول على HTML المختبر
   */
  getLabHTML() {
    return `
      <div class="lab-container mode-specific-content">
        <div class="code-editor-section">
          <div class="code-editor-header">
            <h3><i class="fas fa-code"></i> محرر الكود</h3>
            <div class="tools">
              <select id="languageSelect" class="btn ghost">
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
              </select>
              <button class="btn ghost" onclick="Lab.runCode()">
                <i class="fas fa-play"></i> تشغيل
              </button>
              <button class="btn ghost" onclick="Lab.clearEditor()">
                <i class="fas fa-eraser"></i> مسح
              </button>
              <button class="btn ghost" onclick="Lab.saveCode()">
                <i class="fas fa-save"></i> حفظ
              </button>
            </div>
          </div>
          <textarea id="codeEditor"></textarea>
        </div>
        
        <div class="code-output-section">
          <div class="code-output-header">
            <h3><i class="fas fa-terminal"></i> النتيجة</h3>
            <button class="btn ghost" onclick="Lab.clearOutput()">
              <i class="fas fa-trash"></i> مسح
            </button>
          </div>
          <div id="codeOutput" class="code-output"></div>
        </div>
      </div>
      
      <div style="margin-top: 20px; padding: 15px; background: rgba(102, 126, 234, 0.1); border-radius: 12px;">
        <h4 style="margin-bottom: 10px;"><i class="fas fa-lightbulb"></i> أمثلة سريعة:</h4>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button class="btn ghost" onclick="Lab.loadExample('hello')">
            <i class="fas fa-hand-wave"></i> Hello World
          </button>
          <button class="btn ghost" onclick="Lab.loadExample('calculator')">
            <i class="fas fa-calculator"></i> آلة حاسبة
          </button>
          <button class="btn ghost" onclick="Lab.loadExample('loop')">
            <i class="fas fa-repeat"></i> حلقة تكرار
          </button>
          <button class="btn ghost" onclick="Lab.loadExample('array')">
            <i class="fas fa-list"></i> مصفوفة
          </button>
        </div>
      </div>
    `;
  },

  /**
   * تهيئة المحرر
   */
  initEditor() {
    const textarea = document.getElementById('codeEditor');
    
    if (typeof CodeMirror !== 'undefined') {
      this.editor = CodeMirror.fromTextArea(textarea, {
        mode: 'javascript',
        theme: Storage.getSettings().theme === 'dark' ? 'dracula' : 'default',
        lineNumbers: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        indentUnit: 2,
        tabSize: 2,
        lineWrapping: true
      });
      
      this.editor.setSize('100%', '400px');
      this.loadExample('hello');
    } else {
      // Fallback إذا لم يتم تحميل CodeMirror
      textarea.style.width = '100%';
      textarea.style.height = '400px';
      textarea.style.fontFamily = 'monospace';
      textarea.style.fontSize = '14px';
      textarea.style.padding = '10px';
      textarea.value = this.getExampleCode('hello');
    }
  },

  /**
   * إعداد مستمعي الأحداث
   */
  setupEventListeners() {
    const languageSelect = document.getElementById('languageSelect');
    
    languageSelect.addEventListener('change', (e) => {
      this.changeLanguage(e.target.value);
    });
  },

  /**
   * تغيير اللغة
   */
  changeLanguage(language) {
    this.currentLanguage = language;
    
    if (this.editor) {
      const modes = {
        javascript: 'javascript',
        python: 'python',
        html: 'htmlmixed',
        css: 'css'
      };
      
      this.editor.setOption('mode', modes[language] || 'javascript');
    }
    
    this.clearOutput();
  },

  /**
   * تشغيل الكود
   */
  runCode() {
    const code = this.editor ? this.editor.getValue() : document.getElementById('codeEditor').value;

    if (!code || typeof code !== 'string' || !code.trim()) {
      Notification.show('يرجى كتابة كود أولاً', 'warning');
      return;
    }

    this.clearOutput();
    const output = document.getElementById('codeOutput');

    if (!output) {
      Logger.error('Code output element not found');
      return;
    }

    try {
      switch (this.currentLanguage) {
        case 'javascript':
          this.runJavaScript(code, output);
          break;
        case 'python':
          this.showPythonMessage(output);
          break;
        case 'html':
          this.runHTML(code, output);
          break;
        case 'css':
          this.showCSSMessage(output);
          break;
        default:
          output.textContent = 'اللغة غير مدعومة حالياً';
      }
    } catch (err) {
      Logger.error('Error running code:', err);
      output.innerHTML = `<span style="color: var(--error);">خطأ: ${SecurityUtils.sanitizeInput(err.message)}</span>`;
    }
  },

  /**
   * تشغيل JavaScript - محسن للأمان
   */
  runJavaScript(code, output) {
    if (!code || typeof code !== 'string' || !output) {
      output.innerHTML = `<span style="color: var(--error);">خطأ: كود غير صالح</span>`;
      return;
    }

    // Validate code for dangerous patterns
    const dangerousPatterns = [
      /eval\s*\(/,
      /Function\s*\(/,
      /setTimeout\s*\(/,
      /setInterval\s*\(/,
      /XMLHttpRequest/,
      /fetch\s*\(/,
      /localStorage/,
      /sessionStorage/,
      /document\.cookie/,
      /window\.location/
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        output.innerHTML = `<span style="color: var(--error);">خطأ: الكود يحتوي على دوال محظورة للأمان</span>`;
        Logger.warn('Blocked dangerous code execution');
        return;
      }
    }

    // إعادة تعريف console.log
    const logs = [];
    const originalLog = console.log;

    console.log = function(...args) {
      logs.push(args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return '[Object]';
          }
        }
        return String(arg);
      }).join(' '));
    };

    try {
      // تنفيذ الكود بطريقة آمنة
      const result = new Function('"use strict"; ' + code)();

      // عرض النتائج
      if (logs.length > 0) {
        output.textContent = logs.join('\n');
      } else if (result !== undefined) {
        output.textContent = String(result);
      } else {
        output.textContent = 'تم التنفيذ بنجاح (لا توجد مخرجات)';
      }

      Logger.info('JavaScript code executed successfully');
    } catch (err) {
      output.innerHTML = `<span style="color: var(--error);">خطأ: ${SecurityUtils.sanitizeInput(err.message)}</span>`;
      Logger.error('JavaScript execution error:', err);
    } finally {
      console.log = originalLog;
    }
  },

  /**
   * تشغيل HTML
   */
  runHTML(code, output) {
    if (!code || typeof code !== 'string' || !output) return;

    try {
      const iframe = document.createElement('iframe');
      iframe.style.width = '100%';
      iframe.style.height = '300px';
      iframe.style.border = '1px solid var(--border)';
      iframe.style.borderRadius = '8px';
      iframe.style.backgroundColor = 'white';

      output.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow.document;
      if (doc) {
        doc.open();
        doc.write(code);
        doc.close();
      }
    } catch (err) {
      Logger.error('Error running HTML:', err);
      output.innerHTML = `<span style="color: var(--error);">خطأ في تشغيل HTML: ${SecurityUtils.sanitizeInput(err.message)}</span>`;
    }
  },

  /**
   * رسالة Python
   */
  showPythonMessage(output) {
    if (!output) return;

    output.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <i class="fas fa-info-circle" style="font-size: 48px; color: var(--info); margin-bottom: 15px;"></i>
        <p>تنفيذ Python غير مدعوم مباشرة في المتصفح.</p>
        <p>يمكنك استخدام الكود في بيئة Python محلية أو عبر الإنترنت.</p>
        <a href="https://repl.it/languages/python3" target="_blank" class="btn" style="margin-top: 15px;">
          <i class="fas fa-external-link-alt"></i> تجربة في Repl.it
        </a>
      </div>
    `;
  },

  /**
   * رسالة CSS
   */
  showCSSMessage(output) {
    output.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <i class="fas fa-info-circle" style="font-size: 48px; color: var(--info); margin-bottom: 15px;"></i>
        <p>لتجربة CSS، استخدم وضع HTML واكتب:</p>
        <pre style="background: rgba(0,0,0,0.05); padding: 10px; border-radius: 8px; margin-top: 10px; text-align: left;">
&lt;style&gt;
  /* كود CSS هنا */
&lt;/style&gt;

&lt;div class="test"&gt;
  نص تجريبي
&lt;/div&gt;
        </pre>
      </div>
    `;
  },

  /**
   * مسح المحرر
   */
  clearEditor() {
    if (this.editor) {
      this.editor.setValue('');
    } else {
      document.getElementById('codeEditor').value = '';
    }
    this.clearOutput();
  },

  /**
   * مسح المخرجات
   */
  clearOutput() {
    const output = document.getElementById('codeOutput');
    if (output) {
      output.innerHTML = '';
    }
  },

  /**
   * حفظ الكود
   */
  saveCode() {
    const code = this.editor ? this.editor.getValue() : document.getElementById('codeEditor').value;
    
    if (!code.trim()) {
      Notification.show('لا يوجد كود لحفظه', 'warning');
      return;
    }

    const filename = prompt('أدخل اسم الملف:', `code.${this.getFileExtension()}`);
    
    if (filename) {
      Utils.downloadFile(code, filename, 'text/plain');
      Notification.show('تم حفظ الملف بنجاح', 'success');
    }
  },

  /**
   * الحصول على امتداد الملف
   */
  getFileExtension() {
    const extensions = {
      javascript: 'js',
      python: 'py',
      html: 'html',
      css: 'css'
    };
    return extensions[this.currentLanguage] || 'txt';
  },

  /**
   * تحميل مثال
   */
  loadExample(exampleId) {
    const code = this.getExampleCode(exampleId);
    
    if (this.editor) {
      this.editor.setValue(code);
    } else {
      document.getElementById('codeEditor').value = code;
    }
    
    this.clearOutput();
  },

  /**
   * الحصول على كود المثال
   */
  getExampleCode(exampleId) {
    const examples = {
      hello: `// مرحباً بك في المختبر البرمجي!
console.log("مرحباً بالعالم!");
console.log("Hello World!");

// جرب تعديل الكود والضغط على تشغيل`,

      calculator: `// آلة حاسبة بسيطة
function calculator(num1, num2, operation) {
  switch(operation) {
    case '+':
      return num1 + num2;
    case '-':
      return num1 - num2;
    case '*':
      return num1 * num2;
    case '/':
      return num2 !== 0 ? num1 / num2 : 'خطأ: القسمة على صفر';
    default:
      return 'عملية غير صحيحة';
  }
}

// تجربة الآلة الحاسبة
console.log('10 + 5 =', calculator(10, 5, '+'));
console.log('10 - 5 =', calculator(10, 5, '-'));
console.log('10 * 5 =', calculator(10, 5, '*'));
console.log('10 / 5 =', calculator(10, 5, '/'));`,

      loop: `// حلقة تكرار - طباعة الأرقام من 1 إلى 10
console.log('الأرقام من 1 إلى 10:');
for (let i = 1; i <= 10; i++) {
  console.log(i);
}

// حلقة while - حساب مجموع الأرقام
let sum = 0;
let n = 1;
while (n <= 5) {
  sum += n;
  n++;
}
console.log('\\nمجموع الأرقام من 1 إلى 5:', sum);`,

      array: `// التعامل مع المصفوفات
const fruits = ['تفاح', 'موز', 'برتقال', 'عنب', 'فراولة'];

console.log('الفواكه:', fruits);
console.log('عدد الفواكه:', fruits.length);
console.log('أول فاكهة:', fruits[0]);
console.log('آخر فاكهة:', fruits[fruits.length - 1]);

// إضافة عنصر
fruits.push('مانجو');
console.log('\\nبعد إضافة المانجو:', fruits);

// البحث عن عنصر
const index = fruits.indexOf('برتقال');
console.log('\\nموقع البرتقال:', index);

// تصفية المصفوفة
const longNames = fruits.filter(fruit => fruit.length > 5);
console.log('\\nالفواكه ذات الأسماء الطويلة:', longNames);`
    };

    return examples[exampleId] || examples.hello;
  }
};



/* ----- END FILE: lab.js ----- */



/* ----- FILE: library.js ----- */

/**
 * المكتبة التعليمية
 * تطوير: SEVEN_CODE7
 */

const Library = {
  /**
   * عرض المكتبة
   */
  show() {
    const chatbox = document.getElementById('chatMessages');
    chatbox.innerHTML = this.getLibraryHTML();
    
    setTimeout(() => {
      this.setupEventListeners();
    }, 100);
  },

  /**
   * الحصول على HTML المكتبة
   */
  getLibraryHTML() {
    const content = CONFIG.libraryContent;
    const readArticles = Storage.getReadArticles();
    
    let html = `
      <div class="mode-specific-content" style="padding: 20px;">
        <div style="margin-bottom: 20px;">
          <h2 style="color: var(--brand); margin-bottom: 10px;">
            <i class="fas fa-book"></i> المكتبة التعليمية
          </h2>
          <p style="color: var(--muted);">
            مجموعة من المقالات والدروس التعليمية في مختلف المجالات
          </p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <input 
            type="text" 
            id="librarySearch" 
            class="text" 
            placeholder="ابحث في المكتبة..."
            style="width: 100%;"
          />
        </div>
        
        <div class="library-grid">
    `;
    
    content.forEach(article => {
      const isRead = readArticles.includes(article.id);
      const readBadge = isRead ? '<span style="background: var(--success); color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-right: 8px;">✓ مقروء</span>' : '';
      
      html += `
        <div class="library-item" data-article-id="${article.id}" data-category="${article.category}" data-title="${article.title}">
          <div class="library-item-icon">${article.icon}</div>
          <div class="library-item-title">
            ${article.title}
            ${readBadge}
          </div>
          <div class="library-item-description">${article.description}</div>
          <div class="library-item-meta">
            <span><i class="fas fa-tag"></i> ${article.category}</span>
            <span><i class="fas fa-clock"></i> ${article.readTime}</span>
            <span><i class="fas fa-signal"></i> ${article.difficulty}</span>
          </div>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
    
    return html;
  },

  /**
   * إعداد مستمعي الأحداث
   */
  setupEventListeners() {
    // النقر على المقالة
    document.querySelectorAll('.library-item').forEach(item => {
      item.addEventListener('click', () => {
        const articleId = item.dataset.articleId;
        this.showArticle(articleId);
      });
    });

    // البحث
    const searchInput = document.getElementById('librarySearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterArticles(e.target.value);
      });
    }
  },

  /**
   * عرض مقالة
   */
  showArticle(articleId) {
    const article = CONFIG.libraryContent.find(a => a.id === articleId);
    
    if (!article) {
      Notification.show('المقالة غير موجودة', 'error');
      return;
    }

    const chatbox = document.getElementById('chatMessages');
    chatbox.innerHTML = `
      <div class="mode-specific-content" style="padding: 20px;">
        <button class="btn ghost" onclick="Library.show()" style="margin-bottom: 20px;">
          <i class="fas fa-arrow-right"></i> العودة إلى المكتبة
        </button>
        
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="font-size: 64px; margin-bottom: 15px;">${article.icon}</div>
          <h1 style="color: var(--brand); margin-bottom: 10px;">${article.title}</h1>
          <div style="display: flex; gap: 15px; justify-content: center; color: var(--muted); font-size: 14px;">
            <span><i class="fas fa-tag"></i> ${article.category}</span>
            <span><i class="fas fa-clock"></i> ${article.readTime}</span>
            <span><i class="fas fa-signal"></i> ${article.difficulty}</span>
          </div>
        </div>
        
        <div style="background: var(--card-bg); padding: 30px; border-radius: 16px; line-height: 1.8; font-size: 16px;">
          ${this.formatArticleContent(article.content)}
        </div>
        
        <div style="margin-top: 30px; text-align: center;">
          <button class="btn" onclick="Library.askAboutArticle('${article.id}')">
            <i class="fas fa-question-circle"></i> اسأل عن هذا الموضوع
          </button>
          <button class="btn outline" onclick="Library.shareArticle('${article.id}')">
            <i class="fas fa-share"></i> مشاركة
          </button>
        </div>
      </div>
    `;

    // تسجيل المقالة كمقروءة
    Storage.addReadArticle(articleId);
    
    // تحديث الإحصائيات
    const stats = Storage.getStats();
    stats.pointsCount += 5;
    Storage.saveStats(stats);
    Chat.displayStats();
    
    Notification.show('حصلت على 5 نقاط لقراءة المقالة!', 'success');
  },

  /**
   * تنسيق محتوى المقالة
   */
  formatArticleContent(content) {
    // يمكن توسيع هذا لدعم Markdown كامل
    return content.split('\n').map(paragraph => {
      if (paragraph.trim()) {
        return `<p style="margin-bottom: 15px;">${paragraph}</p>`;
      }
      return '';
    }).join('');
  },

  /**
   * السؤال عن المقالة
   */
  async askAboutArticle(articleId) {
    const article = CONFIG.libraryContent.find(a => a.id === articleId);
    
    if (!article) return;

    // العودة إلى وضع المحادثة
    Modes.switchMode('learn');
    
    // إرسال سؤال تلقائي
    const messageInput = document.getElementById('messageInput');
    messageInput.value = `أخبرني المزيد عن ${article.title}`;
    await Chat.sendMessage();
  },

  /**
   * مشاركة المقالة
   */
  shareArticle(articleId) {
    const article = CONFIG.libraryContent.find(a => a.id === articleId);
    
    if (!article) return;

    const shareText = `اقرأ "${article.title}" على منصة نبراس التعليمية!`;
    
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: shareText,
        url: window.location.href
      }).catch(err => console.log('خطأ في المشاركة:', err));
    } else {
      Utils.copyToClipboard(shareText);
      Notification.show('تم نسخ رابط المشاركة', 'success');
    }
  },

  /**
   * تصفية المقالات
   */
  filterArticles(searchTerm) {
    const items = document.querySelectorAll('.library-item');
    const term = searchTerm.toLowerCase().trim();
    
    items.forEach(item => {
      const title = item.dataset.title.toLowerCase();
      const category = item.dataset.category.toLowerCase();
      
      if (title.includes(term) || category.includes(term) || term === '') {
        item.style.display = 'block';
      } else {
        item.style.display = 'none';
      }
    });
  }
};



/* ----- END FILE: library.js ----- */



/* ----- FILE: challenges.js ----- */

/**
 * التحديات اليومية
 * تطوير: SEVEN_CODE7
 */

const Challenges = {
  currentChallenge: null,

  /**
   * عرض التحديات
   */
  show() {
    const chatbox = document.getElementById('chatMessages');
    chatbox.innerHTML = this.getChallengesHTML();
    
    setTimeout(() => {
      this.setupEventListeners();
      this.loadDailyChallenge();
    }, 100);
  },

  /**
   * الحصول على HTML التحديات
   */
  getChallengesHTML() {
    const completedChallenges = Storage.getCompletedChallenges();
    
    return `
      <div class="mode-specific-content" style="padding: 20px;">
        <div style="margin-bottom: 30px; text-align: center;">
          <h2 style="color: var(--brand); margin-bottom: 10px;">
            <i class="fas fa-trophy"></i> التحديات اليومية
          </h2>
          <p style="color: var(--muted);">
            اختبر معرفتك وتحدى نفسك يومياً!
          </p>
          <div style="margin-top: 15px; font-size: 24px; color: var(--brand);">
            <i class="fas fa-check-circle"></i> ${completedChallenges.length} تحدي مكتمل
          </div>
        </div>

        <div id="dailyChallengeContainer">
          <div style="text-align: center; padding: 40px;">
            <div class="loading-spinner" style="margin: 0 auto;"></div>
            <p style="margin-top: 20px; color: var(--muted);">جاري تحميل التحدي اليومي...</p>
          </div>
        </div>

        <div style="margin-top: 30px;">
          <h3 style="color: var(--text); margin-bottom: 15px;">
            <i class="fas fa-list"></i> جميع التحديات
          </h3>
          <div class="library-grid" id="allChallengesGrid">
            ${this.getAllChallengesHTML()}
          </div>
        </div>
      </div>
    `;
  },

  /**
   * الحصول على HTML جميع التحديات
   */
  getAllChallengesHTML() {
    const challenges = CONFIG.dailyChallenges;
    const completedChallenges = Storage.getCompletedChallenges();
    
    let html = '';
    
    challenges.forEach(challenge => {
      const isCompleted = completedChallenges.includes(challenge.id);
      const difficultyClass = challenge.difficulty;
      const difficultyText = {
        easy: 'سهل',
        medium: 'متوسط',
        hard: 'صعب'
      };
      
      html += `
        <div class="library-item ${isCompleted ? 'completed' : ''}" onclick="Challenges.showChallenge('${challenge.id}')">
          <div class="library-item-icon">${isCompleted ? '✅' : '🎯'}</div>
          <div class="library-item-title">${challenge.title}</div>
          <div class="library-item-description">${challenge.description.substring(0, 80)}...</div>
          <div class="library-item-meta">
            <span><i class="fas fa-tag"></i> ${challenge.category}</span>
            <span class="challenge-difficulty ${difficultyClass}">${difficultyText[challenge.difficulty]}</span>
            <span><i class="fas fa-star"></i> ${challenge.points} نقطة</span>
          </div>
        </div>
      `;
    });
    
    return html;
  },

  /**
   * إعداد مستمعي الأحداث
   */
  setupEventListeners() {
    // سيتم إضافة المستمعين حسب الحاجة
  },

  /**
   * تحميل التحدي اليومي
   */
  loadDailyChallenge() {
    // اختيار تحدي عشوائي لم يكتمل بعد
    const completedChallenges = Storage.getCompletedChallenges();
    const availableChallenges = CONFIG.dailyChallenges.filter(c => 
      !completedChallenges.includes(c.id)
    );
    
    let challenge;
    if (availableChallenges.length > 0) {
      // اختيار تحدي عشوائي من التحديات المتاحة
      const randomIndex = Math.floor(Math.random() * availableChallenges.length);
      challenge = availableChallenges[randomIndex];
    } else {
      // إذا اكتملت جميع التحديات، اختر واحداً عشوائياً
      const randomIndex = Math.floor(Math.random() * CONFIG.dailyChallenges.length);
      challenge = CONFIG.dailyChallenges[randomIndex];
    }
    
    this.currentChallenge = challenge;
    this.displayChallenge(challenge, true);
  },

  /**
   * عرض تحدي
   */
  showChallenge(challengeId) {
    const challenge = CONFIG.dailyChallenges.find(c => c.id === challengeId);
    
    if (!challenge) {
      Notification.show('التحدي غير موجود', 'error');
      return;
    }

    this.currentChallenge = challenge;
    
    const container = document.getElementById('dailyChallengeContainer');
    container.innerHTML = this.getChallengeHTML(challenge, false);
  },

  /**
   * عرض التحدي
   */
  displayChallenge(challenge, isDaily = false) {
    const container = document.getElementById('dailyChallengeContainer');
    container.innerHTML = this.getChallengeHTML(challenge, isDaily);
  },

  /**
   * الحصول على HTML التحدي
   */
  getChallengeHTML(challenge, isDaily) {
    const completedChallenges = Storage.getCompletedChallenges();
    const isCompleted = completedChallenges.includes(challenge.id);
    
    const difficultyText = {
      easy: 'سهل',
      medium: 'متوسط',
      hard: 'صعب'
    };

    return `
      <div class="challenge-card">
        <div class="challenge-header">
          <div>
            <div class="challenge-title">
              ${isDaily ? '🌟 ' : ''}${challenge.title}
            </div>
            <div style="color: var(--muted); font-size: 14px; margin-top: 5px;">
              <i class="fas fa-tag"></i> ${challenge.category}
            </div>
          </div>
          <div class="challenge-difficulty ${challenge.difficulty}">
            ${difficultyText[challenge.difficulty]}
          </div>
        </div>
        
        <div class="challenge-description">
          ${challenge.description}
        </div>
        
        ${isCompleted ? `
          <div style="background: var(--success); color: white; padding: 15px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
            <i class="fas fa-check-circle" style="font-size: 32px; margin-bottom: 10px;"></i>
            <div style="font-weight: 700;">تم إكمال هذا التحدي!</div>
          </div>
        ` : ''}
        
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 10px; font-weight: 600; color: var(--text);">
            <i class="fas fa-pencil-alt"></i> إجابتك:
          </label>
          <textarea 
            id="challengeAnswer" 
            class="text" 
            style="width: 100%; min-height: 100px; border-radius: 12px; padding: 15px;"
            placeholder="اكتب إجابتك هنا..."
            ${isCompleted ? 'disabled' : ''}
          ></textarea>
        </div>
        
        <div class="challenge-actions">
          <button class="btn" onclick="Challenges.submitAnswer()" ${isCompleted ? 'disabled' : ''}>
            <i class="fas fa-paper-plane"></i> إرسال الإجابة
          </button>
          <button class="btn outline" onclick="Challenges.showHint()">
            <i class="fas fa-lightbulb"></i> تلميح
          </button>
          <button class="btn ghost" onclick="Challenges.skipChallenge()">
            <i class="fas fa-forward"></i> تخطي
          </button>
        </div>
        
        <div id="challengeFeedback" style="margin-top: 20px;"></div>
      </div>
    `;
  },

  /**
   * إرسال الإجابة
   */
  async submitAnswer() {
    if (!this.currentChallenge) return;

    const answerInput = document.getElementById('challengeAnswer');
    const userAnswer = answerInput.value.trim();
    
    if (!userAnswer) {
      Notification.show('يرجى كتابة إجابة', 'warning');
      return;
    }

    const feedback = document.getElementById('challengeFeedback');
    feedback.innerHTML = '<div style="text-align: center;"><div class="loading-spinner" style="margin: 0 auto;"></div></div>';

    // التحقق من الإجابة
    const isCorrect = this.checkAnswer(userAnswer, this.currentChallenge.answer);
    
    if (isCorrect) {
      // إجابة صحيحة
      const points = this.currentChallenge.points;
      
      feedback.innerHTML = `
        <div style="background: var(--success); color: white; padding: 20px; border-radius: 12px; text-align: center;">
          <i class="fas fa-check-circle" style="font-size: 48px; margin-bottom: 15px;"></i>
          <h3 style="margin-bottom: 10px;">إجابة صحيحة! 🎉</h3>
          <p>حصلت على ${points} نقطة</p>
        </div>
      `;
      
      // تحديث الإحصائيات
      const stats = Storage.getStats();
      stats.pointsCount += points;
      Storage.saveStats(stats);
      Chat.displayStats();
      
      // تسجيل التحدي كمكتمل
      Storage.addCompletedChallenge(this.currentChallenge.id);
      
      // تعطيل الإدخال
      answerInput.disabled = true;
      
      Notification.show(`أحسنت! حصلت على ${points} نقطة`, 'success');
      Utils.playSound(800, 300);
      
      // تحميل تحدي جديد بعد 3 ثوان
      setTimeout(() => {
        this.loadDailyChallenge();
      }, 3000);
    } else {
      // إجابة خاطئة
      feedback.innerHTML = `
        <div style="background: var(--error); color: white; padding: 20px; border-radius: 12px; text-align: center;">
          <i class="fas fa-times-circle" style="font-size: 48px; margin-bottom: 15px;"></i>
          <h3 style="margin-bottom: 10px;">إجابة خاطئة</h3>
          <p>حاول مرة أخرى أو اطلب تلميحاً</p>
        </div>
      `;
      
      Notification.show('إجابة خاطئة، حاول مرة أخرى', 'error');
      Utils.playSound(400, 200);
    }
  },

  /**
   * التحقق من الإجابة
   */
  checkAnswer(userAnswer, correctAnswer) {
    // تطبيع الإجابات
    const normalize = (text) => {
      return text.toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s]/g, '');
    };
    
    const normalizedUser = normalize(userAnswer);
    const normalizedCorrect = normalize(correctAnswer);
    
    // التحقق من التطابق التام
    if (normalizedUser === normalizedCorrect) {
      return true;
    }
    
    // التحقق من التطابق الجزئي (70% على الأقل)
    const similarity = this.calculateSimilarity(normalizedUser, normalizedCorrect);
    return similarity >= 0.7;
  },

  /**
   * حساب التشابه بين نصين
   */
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) {
      return 1.0;
    }
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  },

  /**
   * حساب مسافة Levenshtein
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  },

  /**
   * عرض تلميح
   */
  showHint() {
    if (!this.currentChallenge) return;

    const feedback = document.getElementById('challengeFeedback');
    feedback.innerHTML = `
      <div style="background: var(--info); color: white; padding: 15px; border-radius: 12px;">
        <h4 style="margin-bottom: 10px;"><i class="fas fa-lightbulb"></i> تلميح:</h4>
        <p>${this.currentChallenge.hint}</p>
      </div>
    `;
    
    Utils.playSound(600, 100);
  },

  /**
   * تخطي التحدي
   */
  skipChallenge() {
    if (confirm('هل أنت متأكد من تخطي هذا التحدي؟')) {
      this.loadDailyChallenge();
      Notification.show('تم تحميل تحدي جديد', 'info');
    }
  }
};



/* ----- END FILE: challenges.js ----- */



/* ----- FILE: analytics.js ----- */

/**
 * الإحصائيات المتقدمة
 * تطوير: SEVEN_CODE7
 */

const Analytics = {
  charts: {},

  /**
   * عرض الإحصائيات
   */
  show() {
    const chatbox = document.getElementById('chatMessages');
    chatbox.innerHTML = this.getAnalyticsHTML();
    
    setTimeout(() => {
      this.initCharts();
    }, 100);
  },

  /**
   * الحصول على HTML الإحصائيات
   */
  getAnalyticsHTML() {
    const stats = Storage.getStats();
    const badges = Storage.getBadges();
    const completedChallenges = Storage.getCompletedChallenges();
    const readArticles = Storage.getReadArticles();
    
    return `
      <div class="mode-specific-content" style="padding: 20px;">
        <div style="margin-bottom: 30px; text-align: center;">
          <h2 style="color: var(--brand); margin-bottom: 10px;">
            <i class="fas fa-chart-bar"></i> الإحصائيات المتقدمة
          </h2>
          <p style="color: var(--muted);">
            تتبع تقدمك وإنجازاتك بالتفصيل
          </p>
        </div>

        <!-- ملخص الإحصائيات -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px;">
          <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; border-radius: 12px; text-align: center;">
            <div style="font-size: 36px; font-weight: 800; margin-bottom: 5px;">${stats.questionsCount}</div>
            <div style="opacity: 0.9;">أسئلة تم الإجابة عليها</div>
          </div>
          <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 12px; text-align: center;">
            <div style="font-size: 36px; font-weight: 800; margin-bottom: 5px;">${stats.pointsCount}</div>
            <div style="opacity: 0.9;">إجمالي النقاط</div>
          </div>
          <div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 20px; border-radius: 12px; text-align: center;">
            <div style="font-size: 36px; font-weight: 800; margin-bottom: 5px;">${stats.learningLevel}</div>
            <div style="opacity: 0.9;">المستوى الحالي</div>
          </div>
          <div style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 20px; border-radius: 12px; text-align: center;">
            <div style="font-size: 36px; font-weight: 800; margin-bottom: 5px;">${stats.streakCount}</div>
            <div style="opacity: 0.9;">سلسلة الأيام</div>
          </div>
        </div>

        <!-- الرسوم البيانية -->
        <div class="analytics-grid">
          <div class="chart-container">
            <div class="chart-title">
              <i class="fas fa-chart-line"></i> التقدم اليومي
            </div>
            <canvas id="progressChart"></canvas>
          </div>
          
          <div class="chart-container">
            <div class="chart-title">
              <i class="fas fa-chart-pie"></i> توزيع النشاطات
            </div>
            <canvas id="activityChart"></canvas>
          </div>
          
          <div class="chart-container">
            <div class="chart-title">
              <i class="fas fa-chart-bar"></i> النقاط الأسبوعية
            </div>
            <canvas id="pointsChart"></canvas>
          </div>
          
          <div class="chart-container">
            <div class="chart-title">
              <i class="fas fa-trophy"></i> الإنجازات
            </div>
            <div style="padding: 20px;">
              <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <span><i class="fas fa-medal"></i> الشارات</span>
                  <span style="font-weight: 700;">${badges.length} / ${CONFIG.badges.length}</span>
                </div>
                <div class="progress">
                  <span style="width: ${(badges.length / CONFIG.badges.length) * 100}%"></span>
                </div>
              </div>
              
              <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <span><i class="fas fa-tasks"></i> التحديات</span>
                  <span style="font-weight: 700;">${completedChallenges.length} / ${CONFIG.dailyChallenges.length}</span>
                </div>
                <div class="progress">
                  <span style="width: ${(completedChallenges.length / CONFIG.dailyChallenges.length) * 100}%"></span>
                </div>
              </div>
              
              <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <span><i class="fas fa-book-open"></i> المقالات</span>
                  <span style="font-weight: 700;">${readArticles.length} / ${CONFIG.libraryContent.length}</span>
                </div>
                <div class="progress">
                  <span style="width: ${(readArticles.length / CONFIG.libraryContent.length) * 100}%"></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- معلومات إضافية -->
        <div style="margin-top: 30px; padding: 20px; background: var(--card-bg); border-radius: 12px; border: 1px solid var(--border);">
          <h3 style="margin-bottom: 15px; color: var(--brand);">
            <i class="fas fa-info-circle"></i> معلومات إضافية
          </h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
            <div>
              <div style="color: var(--muted); margin-bottom: 5px;">تاريخ البدء</div>
              <div style="font-weight: 600;">${Utils.formatDate(stats.startDate)}</div>
            </div>
            <div>
              <div style="color: var(--muted); margin-bottom: 5px;">آخر زيارة</div>
              <div style="font-weight: 600;">${stats.lastVisit ? Utils.formatDate(stats.lastVisit) : 'غير متوفر'}</div>
            </div>
            <div>
              <div style="color: var(--muted); margin-bottom: 5px;">إجمالي الوقت</div>
              <div style="font-weight: 600;">${Math.floor(stats.totalTime / 60)} دقيقة</div>
            </div>
            <div>
              <div style="color: var(--muted); margin-bottom: 5px;">متوسط الوقت لكل سؤال</div>
              <div style="font-weight: 600;">${stats.questionsCount > 0 ? Math.round(stats.totalTime / stats.questionsCount) : 0} ثانية</div>
            </div>
          </div>
        </div>

        <!-- أزرار الإجراءات -->
        <div style="margin-top: 30px; text-align: center; display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
          <button class="btn" onclick="Analytics.exportReport()">
            <i class="fas fa-file-export"></i> تصدير التقرير
          </button>
          <button class="btn outline" onclick="Analytics.shareProgress()">
            <i class="fas fa-share-alt"></i> مشاركة التقدم
          </button>
          <button class="btn ghost" onclick="Analytics.resetStats()">
            <i class="fas fa-redo"></i> إعادة تعيين الإحصائيات
          </button>
        </div>
      </div>
    `;
  },

  /**
   * تهيئة الرسوم البيانية
   */
  initCharts() {
    if (typeof Chart === 'undefined') {
      console.warn('مكتبة Chart.js غير محملة');
      return;
    }

    try {
      this.initProgressChart();
      this.initActivityChart();
      this.initPointsChart();
    } catch(e) {
      console.warn('خطأ في رسم الرسوم البيانية:', e);
    }
  },

  /**
   * رسم بياني للتقدم
   */
  initProgressChart() {
    const ctx = document.getElementById('progressChart');
    if (!ctx) return;

    const stats = Storage.getStats();
    const days = 7;
    const labels = [];
    const data = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('ar-SA', { weekday: 'short' }));
      // بيانات تجريبية - يمكن تحسينها لتخزين بيانات يومية فعلية
      data.push(Math.floor(Math.random() * 50) + 10);
    }

    this.charts.progress = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'الأسئلة',
          data,
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  },

  /**
   * رسم بياني للنشاطات
   */
  initActivityChart() {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;

    const completedChallenges = Storage.getCompletedChallenges().length;
    const readArticles = Storage.getReadArticles().length;
    const stats = Storage.getStats();

    this.charts.activity = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['الأسئلة', 'التحديات', 'المقالات'],
        datasets: [{
          data: [stats.questionsCount, completedChallenges, readArticles],
          backgroundColor: [
            '#667eea',
            '#10b981',
            '#f59e0b'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  },

  /**
   * رسم بياني للنقاط
   */
  initPointsChart() {
    const ctx = document.getElementById('pointsChart');
    if (!ctx) return;

    const weeks = ['الأسبوع 1', 'الأسبوع 2', 'الأسبوع 3', 'الأسبوع 4'];
    const data = weeks.map(() => Math.floor(Math.random() * 200) + 50);

    this.charts.points = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: weeks,
        datasets: [{
          label: 'النقاط',
          data,
          backgroundColor: 'rgba(102, 126, 234, 0.8)',
          borderColor: '#667eea',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  },

  /**
   * تصدير التقرير
   */
  exportReport() {
    const stats = Storage.getStats();
    const badges = Storage.getBadges();
    const completedChallenges = Storage.getCompletedChallenges();
    const readArticles = Storage.getReadArticles();

    const report = `
# تقرير التقدم - منصة نبراس

## الإحصائيات العامة
- **الأسئلة المجابة**: ${stats.questionsCount}
- **إجمالي النقاط**: ${stats.pointsCount}
- **المستوى الحالي**: ${stats.learningLevel}
- **سلسلة الأيام**: ${stats.streakCount}
- **إجمالي الوقت**: ${Math.floor(stats.totalTime / 60)} دقيقة

## الإنجازات
- **الشارات المكتسبة**: ${badges.length} / ${CONFIG.badges.length}
- **التحديات المكتملة**: ${completedChallenges.length} / ${CONFIG.dailyChallenges.length}
- **المقالات المقروءة**: ${readArticles.length} / ${CONFIG.libraryContent.length}

## الشارات
${badges.map(id => {
  const badge = CONFIG.badges.find(b => b.id === id);
  return badge ? `- ${badge.icon} ${badge.name}` : '';
}).join('\n')}

## معلومات إضافية
- **تاريخ البدء**: ${Utils.formatDate(stats.startDate)}
- **آخر زيارة**: ${stats.lastVisit ? Utils.formatDate(stats.lastVisit) : 'غير متوفر'}
- **متوسط الوقت لكل سؤال**: ${stats.questionsCount > 0 ? Math.round(stats.totalTime / stats.questionsCount) : 0} ثانية

---
تم إنشاء هذا التقرير بواسطة منصة نبراس - SEVEN_CODE7
    `.trim();

    Utils.downloadFile(report, `nebras_report_${new Date().toISOString().split('T')[0]}.md`, 'text/markdown');
    Notification.show('تم تصدير التقرير بنجاح', 'success');
  },

  /**
   * مشاركة التقدم
   */
  shareProgress() {
    const stats = Storage.getStats();
    const shareText = `لقد حققت ${stats.pointsCount} نقطة ووصلت إلى المستوى ${stats.learningLevel} على منصة نبراس التعليمية! 🎓✨`;

    if (navigator.share) {
      navigator.share({
        title: 'تقدمي على نبراس',
        text: shareText,
        url: window.location.href
      }).catch(err => console.log('خطأ في المشاركة:', err));
    } else {
      Utils.copyToClipboard(shareText);
      Notification.show('تم نسخ النص للمشاركة', 'success');
    }
  },

  /**
   * إعادة تعيين الإحصائيات
   */
  resetStats() {
    if (confirm('هل أنت متأكد من إعادة تعيين جميع الإحصائيات؟ هذا الإجراء لا يمكن التراجع عنه!')) {
      if (confirm('تأكيد نهائي: سيتم حذف جميع بياناتك!')) {
        Storage.clear();
        Notification.show('تم إعادة تعيين الإحصائيات', 'success');
        setTimeout(() => {
          location.reload();
        }, 1500);
      }
    }
  }
};



/* ----- END FILE: analytics.js ----- */



/* ----- FILE: settings.js ----- */

/**
 * إدارة الإعدادات
 * تطوير: SEVEN_CODE7
 */

const Settings = {
  /**
   * تهيئة الإعدادات
   */
  init() {
    this.loadSettings();
    this.setupEventListeners();
  },

  /**
   * إعداد مستمعي الأحداث
   */
  setupEventListeners() {
    const settingsBtn = document.getElementById('settingsBtn');
    
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.openSettings());
    }
  },

  /**
   * فتح نافذة الإعدادات
   */
  openSettings() {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;
    modal.classList.add('active');
    
    // تحميل القيم الحالية
    const settings = Storage.getSettings();
    
    if (document.getElementById('themeSelect'))
      document.getElementById('themeSelect').value = settings.theme;
    if (document.getElementById('primaryColor'))
      document.getElementById('primaryColor').value = settings.primaryColor;
    if (document.getElementById('fontSize'))
      document.getElementById('fontSize').value = settings.fontSize;
    if (document.getElementById('notificationsEnabled'))
      document.getElementById('notificationsEnabled').checked = settings.notificationsEnabled;
    if (document.getElementById('soundEnabled'))
      document.getElementById('soundEnabled').checked = settings.soundEnabled;
    if (document.getElementById('detailLevel'))
      document.getElementById('detailLevel').value = settings.detailLevel;
  },

  /**
   * إغلاق نافذة الإعدادات
   */
  closeSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
      modal.classList.remove('active');
    }
  },

  /**
   * حفظ الإعدادات
   */
  saveSettings() {
    const settings = {
      theme: document.getElementById('themeSelect').value,
      primaryColor: document.getElementById('primaryColor').value,
      fontSize: document.getElementById('fontSize').value,
      notificationsEnabled: document.getElementById('notificationsEnabled').checked,
      soundEnabled: document.getElementById('soundEnabled').checked,
      detailLevel: document.getElementById('detailLevel').value
    };

    Storage.saveSettings(settings);
    this.applySettings(settings);
    this.closeSettings();
    
    Notification.show('تم حفظ الإعدادات بنجاح', 'success');
  },

  /**
   * إعادة تعيين الإعدادات
   */
  resetSettings() {
    if (confirm('هل أنت متأكد من إعادة تعيين الإعدادات إلى القيم الافتراضية؟')) {
      const defaultSettings = {
        theme: 'light',
        primaryColor: '#667eea',
        fontSize: 'medium',
        notificationsEnabled: true,
        soundEnabled: true,
        detailLevel: 'medium'
      };

      Storage.saveSettings(defaultSettings);
      this.applySettings(defaultSettings);
      this.openSettings(); // إعادة فتح لتحديث القيم
      
      Notification.show('تم إعادة تعيين الإعدادات', 'success');
    }
  },

  /**
   * تحميل الإعدادات
   */
  loadSettings() {
    const settings = Storage.getSettings();
    this.applySettings(settings);
  },

  /**
   * تطبيق الإعدادات
   */
  applySettings(settings) {
    // تطبيق الثيم
    this.applyTheme(settings.theme);
    
    // تطبيق اللون الأساسي
    this.applyPrimaryColor(settings.primaryColor);
    
    // تطبيق حجم الخط
    this.applyFontSize(settings.fontSize);
  },

  /**
   * تطبيق الثيم
   */
  applyTheme(theme) {
    const root = document.documentElement;
    
    if (theme === 'auto') {
      // استخدام إعدادات النظام
      const isDark = Utils.isSystemDarkMode();
      root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }
    
    // تحديث أيقونة الزر
    const themeBtn = document.getElementById('themeBtn');
    if (themeBtn) {
      const icon = themeBtn.querySelector('i');
      if (icon) {
        if (theme === 'dark' || (theme === 'auto' && Utils.isSystemDarkMode())) {
          icon.className = 'fas fa-sun';
        } else {
          icon.className = 'fas fa-moon';
        }
      }
    }
  },

  /**
   * تطبيق اللون الأساسي
   */
  applyPrimaryColor(color) {
    const root = document.documentElement;
    root.style.setProperty('--brand', color);
    root.style.setProperty('--bubble-user-grad-1', color);
    
    // حساب لون ثانوي
    const secondaryColor = Utils.darkenColor(color, 10);
    root.style.setProperty('--brand2', secondaryColor);
    root.style.setProperty('--bubble-user-grad-2', secondaryColor);
  },

  /**
   * تطبيق حجم الخط
   */
  applyFontSize(size) {
    const root = document.documentElement;
    
    const sizes = {
      small: '14px',
      medium: '16px',
      large: '18px'
    };
    
    root.style.fontSize = sizes[size] || sizes.medium;
  },

  /**
   * تبديل الثيم
   */
  toggleTheme() {
    const settings = Storage.getSettings();
    const currentTheme = settings.theme;
    
    let newTheme;
    if (currentTheme === 'light') {
      newTheme = 'dark';
    } else if (currentTheme === 'dark') {
      newTheme = 'auto';
    } else {
      newTheme = 'light';
    }
    
    settings.theme = newTheme;
    Storage.saveSettings(settings);
    this.applyTheme(newTheme);
    
    const themeNames = {
      light: 'الوضع الفاتح',
      dark: 'الوضع الداكن',
      auto: 'الوضع التلقائي'
    };
    
    Notification.show(`تم التبديل إلى ${themeNames[newTheme]}`, 'info');
  }
};

// وظائف عامة
function changeTheme(theme) {
  const settings = Storage.getSettings();
  settings.theme = theme;
  Storage.saveSettings(settings);
  Settings.applyTheme(theme);
}

function changePrimaryColor(color) {
  Settings.applyPrimaryColor(color);
}

function changeFontSize(size) {
  Settings.applyFontSize(size);
}

function toggleNotifications(enabled) {
  const settings = Storage.getSettings();
  settings.notificationsEnabled = enabled;
  Storage.saveSettings(settings);
}

function toggleSound(enabled) {
  const settings = Storage.getSettings();
  settings.soundEnabled = enabled;
  Storage.saveSettings(settings);
}

function changeDetailLevel(level) {
  const settings = Storage.getSettings();
  settings.detailLevel = level;
  Storage.saveSettings(settings);
}

function saveSettings() {
  Settings.saveSettings();
}

function resetSettings() {
  Settings.resetSettings();
}

function closeSettings() {
  Settings.closeSettings();
}



/* ----- END FILE: settings.js ----- */



/* ----- FILE: chat.js ----- */

/**
 * إدارة المحادثة
 * تطوير: SEVEN_CODE7
 */

const Chat = {
  messages: [],
  currentMode: 'learn',
  isTyping: false,
  uploadedImages: [],

  /**
   * تهيئة المحادثة
   */
  init() {
    this.loadMessages();
    this.setupEventListeners();
    this.setupDragAndDrop();
  },

  /**
   * إعداد مستمعي الأحداث
   */
  setupEventListeners() {
    const sendBtn = document.getElementById('sendBtn');
    const messageInput = document.getElementById('messageInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');
    const editBtn = document.getElementById('editBtn');
    const repeatBtn = document.getElementById('repeatBtn');
    const clearBtn = document.getElementById('clearBtn');
    const exportBtn = document.getElementById('exportBtn');
    const voiceBtn = document.getElementById('voiceBtn');
    const emojiBtn = document.getElementById('emojiBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');

    // إرسال الرسالة
    sendBtn.addEventListener('click', () => this.sendMessage());
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // رفع الصور
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => this.handleFileUpload(e));

    // تحرير آخر رسالة
    editBtn.addEventListener('click', () => this.editLastMessage());

    // إعادة إرسال
    repeatBtn.addEventListener('click', () => this.repeatLastMessage());

    // مسح الذاكرة
    clearBtn.addEventListener('click', () => this.clearMemory());

    // تصدير الجلسة
    exportBtn.addEventListener('click', () => this.exportSession());

    // الإدخال الصوتي
    voiceBtn.addEventListener('click', () => this.startVoiceInput());

    // منتقي الإيموجي
    emojiBtn.addEventListener('click', () => this.toggleEmojiPicker());

    // ملء الشاشة
    fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
  },

  /**
   * إعداد السحب والإفلات
   */
  setupDragAndDrop() {
    const dropZone = document.getElementById('dropZone');

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--brand)';
      dropZone.style.backgroundColor = 'rgba(102, 126, 234, 0.05)';
    });

    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = '';
      dropZone.style.backgroundColor = '';
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = '';
      dropZone.style.backgroundColor = '';

      const files = Array.from(e.dataTransfer.files).filter(file => 
        file.type.startsWith('image/')
      );

      if (files.length > 0) {
        this.handleFiles(files);
      }
    });
  },

  /**
   * معالجة رفع الملفات
   */
  async handleFileUpload(event) {
    const files = Array.from(event.target.files);
    await this.handleFiles(files);
    event.target.value = ''; // إعادة تعيين الإدخال
  },

  /**
   * معالجة الملفات
   */
  async handleFiles(files) {
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        try {
          const base64 = await Utils.imageToBase64(file);
          this.uploadedImages.push(base64);
          this.displayImageThumbnail(base64);
        } catch (err) {
          console.error('خطأ في معالجة الصورة:', err);
          Notification.show('خطأ في رفع الصورة', 'error');
        }
      }
    }
  },

  /**
   * عرض صورة مصغرة
   */
  displayImageThumbnail(base64) {
    const thumbsContainer = document.getElementById('thumbs');
    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    
    const img = document.createElement('img');
    img.src = base64;
    img.onclick = () => this.showImageModal(base64);
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'x';
    removeBtn.textContent = '×';
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      this.removeImage(base64, thumb);
    };
    
    thumb.appendChild(img);
    thumb.appendChild(removeBtn);
    thumbsContainer.appendChild(thumb);
  },

  /**
   * إزالة صورة
   */
  removeImage(base64, thumbElement) {
    const index = this.uploadedImages.indexOf(base64);
    if (index > -1) {
      this.uploadedImages.splice(index, 1);
    }
    if (thumbElement && thumbElement.remove) thumbElement.remove();
  },

  /**
   * عرض الصورة في مودال
   */
  showImageModal(src) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    modalImage.src = src;
    modal.classList.add('active');
  },

  /**
   * إرسال رسالة - محسن مع التحقق والأمان
   */
  async sendMessage() {
    PerformanceMonitor.start('chat_sendMessage');

    try {
      const input = Utils.getElement('#messageInput');
      if (!input) {
        throw new Error('Message input not found');
      }

      const text = SecurityUtils.sanitizeInput(input.value.trim());

      if (!text && this.uploadedImages.length === 0) {
        Logger.warn('Empty message and no images');
        return;
      }

      // Validate message length
      if (text.length > 10000) {
        Notification.show('الرسالة طويلة جداً (الحد الأقصى 10000 حرف)', 'warning');
        return;
      }

      // إضافة رسالة المستخدم
      this.addMessage('user', text, this.uploadedImages);

      // مسح الإدخال
      input.value = '';
      const thumbsContainer = Utils.getElement('#thumbs');
      if (thumbsContainer) {
        thumbsContainer.innerHTML = '';
      }
      const images = [...this.uploadedImages];
      this.uploadedImages = [];

      // عرض مؤشر الكتابة
      this.showTyping();

      // الحصول على الرد من الذكاء الاصطناعي مع إعادة المحاولة
      const response = await this._sendMessageWithRetry(text, images);

      // إخفاء مؤشر الكتابة
      this.hideTyping();

      if (response.success) {
        // إضافة رسالة الذكاء الاصطناعي
        this.addMessage('assistant', response.message);

        // تحديث الإحصائيات
        this.updateStats(response.duration);

        // حفظ الرسائل
        this.saveMessages();

        Logger.info('Message sent successfully');
      } else {
        // عرض رسالة خطأ
        const errorMessage = response.error || 'عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.';
        this.addMessage('assistant', errorMessage);
        Notification.show('خطأ في الاتصال', 'error');
        Logger.error('Message send failed:', response.error);
      }

    } catch (err) {
      Logger.error('Error in sendMessage:', err);
      this.hideTyping();
      Notification.show('حدث خطأ غير متوقع', 'error');
    } finally {
      PerformanceMonitor.end('chat_sendMessage');
    }
  },

  async _sendMessageWithRetry(text, images, attempt = 1) {
    const startTime = Date.now();

    try {
      const response = await this.getAIResponse(text, images);
      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);

      return { ...response, duration };
    } catch (err) {
      if (attempt < CONFIG.api.retries && (err instanceof NetworkError)) {
        Logger.warn(`Retry attempt ${attempt} for AI request`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        return this._sendMessageWithRetry(text, images, attempt + 1);
      }
      throw err;
    }
  },

  /**
   * الحصول على رد من الذكاء الاصطناعي
   */
  async getAIResponse(text, images = []) {
    const mode = CONFIG.modes[this.currentMode];
    const systemPrompt = mode.systemPrompt;

    // بناء سياق المحادثة
    const context = this.messages.slice(-10).map(msg => ({
      role: msg.role,
      content: msg.text
    }));

    if (images.length > 0) {
      return await AI.sendMessageWithImages(text, images, systemPrompt);
    } else {
      return await AI.sendMessageWithContext(text, context, systemPrompt);
    }
  },

  /**
   * إضافة رسالة
   */
  addMessage(role, text, images = []) {
    const message = {
      id: Utils.generateId(),
      role,
      text,
      images,
      timestamp: new Date().toISOString()
    };

    this.messages.push(message);
    this.renderMessage(message);
    this.scrollToBottom();
  },

  /**
   * عرض رسالة
   */
  renderMessage(message) {
    const chatbox = document.getElementById('chatMessages');
    if (!chatbox) return;

    // إزالة رسالة الترحيب إذا كانت موجودة
    const welcomeMessage = chatbox.querySelector('.welcome-message');
    if (welcomeMessage) {
      welcomeMessage.remove();
    }

    const row = document.createElement('div');
    row.className = 'row';
    row.dataset.messageId = message.id;

    const msg = document.createElement('div');
    msg.className = `msg ${message.role === 'user' ? 'user' : 'ai'}`;

    // النص
    if (message.text) {
      const textContent = document.createElement('div');
      textContent.innerHTML = Utils.markdownToHTML(message.text);
      msg.appendChild(textContent);
    }

    // الصور
    if (message.images && message.images.length > 0) {
      message.images.forEach(img => {
        const image = document.createElement('img');
        image.src = img;
        image.onclick = () => this.showImageModal(img);
        msg.appendChild(image);
      });
    }

    // الطابع الزمني
    const timestamp = document.createElement('div');
    timestamp.className = 'ts';
    timestamp.textContent = Utils.formatShortDate(message.timestamp);
    msg.appendChild(timestamp);

    row.appendChild(msg);
    chatbox.appendChild(row);
  },

  /**
   * عرض مؤشر الكتابة
   */
  showTyping() {
    const typing = document.getElementById('typing');
    typing.classList.add('active');
    this.isTyping = true;
  },

  /**
   * إخفاء مؤشر الكتابة
   */
  hideTyping() {
    const typing = document.getElementById('typing');
    typing.classList.remove('active');
    this.isTyping = false;
  },

  /**
   * التمرير إلى الأسفل
   */
  scrollToBottom() {
    const chatbox = document.getElementById('chatMessages');
    chatbox.scrollTop = chatbox.scrollHeight;
  },

  /**
   * تحرير آخر رسالة
   */
  editLastMessage() {
    const userMessages = this.messages.filter(m => m.role === 'user');
    if (userMessages.length === 0) return;

    const lastMessage = userMessages[userMessages.length - 1];
    const input = document.getElementById('messageInput');
    input.value = lastMessage.text;
    input.focus();

    // حذف آخر رسالتين (المستخدم والذكاء الاصطناعي)
    this.messages = this.messages.slice(0, -2);
    this.renderMessages();
  },

  /**
   * إعادة إرسال
   */
  async repeatLastMessage() {
    const userMessages = this.messages.filter(m => m.role === 'user');
    if (userMessages.length === 0) return;

    const lastMessage = userMessages[userMessages.length - 1];
    
    // حذف آخر رد من الذكاء الاصطناعي
    if (this.messages[this.messages.length - 1].role === 'assistant') {
      this.messages.pop();
    }

    // إعادة الإرسال
    this.showTyping();
    const startTime = Date.now();
    const response = await this.getAIResponse(lastMessage.text, lastMessage.images || []);
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    this.hideTyping();

    if (response.success) {
      this.addMessage('assistant', response.message);
      this.updateStats(duration);
      this.saveMessages();
    }
  },

  /**
   * مسح الذاكرة
   */
  clearMemory() {
    if (confirm('هل أنت متأكد من مسح جميع الرسائل؟')) {
      this.messages = [];
      this.renderMessages();
      this.saveMessages();
      Notification.show('تم مسح الذاكرة بنجاح', 'success');
    }
  },

  /**
   * تصدير الجلسة
   */
  exportSession() {
    const data = Storage.exportAll();
    const filename = `nebras_export_${new Date().toISOString().split('T')[0]}.json`;
    Utils.downloadJSON(data, filename);
    Notification.show('تم تصدير الجلسة بنجاح', 'success');
  },

  /**
   * بدء الإدخال الصوتي
   */
  startVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      Notification.show('المتصفح لا يدعم التعرف على الصوت', 'error');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'ar-SA';
    recognition.continuous = false;
    recognition.interimResults = false;

    const voiceBtn = document.getElementById('voiceBtn');
    voiceBtn.classList.add('pulse');

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const input = document.getElementById('messageInput');
      input.value = transcript;
      voiceBtn.classList.remove('pulse');
      Utils.playSound(800, 100);
    };

    recognition.onerror = (event) => {
      console.error('خطأ في التعرف على الصوت:', event.error);
      voiceBtn.classList.remove('pulse');
      Notification.show('خطأ في التعرف على الصوت', 'error');
    };

    recognition.onend = () => {
      voiceBtn.classList.remove('pulse');
    };

    recognition.start();
    Utils.playSound(600, 100);
  },

  /**
   * تبديل منتقي الإيموجي
   */
  toggleEmojiPicker() {
    const picker = document.getElementById('emojiPicker');
    picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
  },

  /**
   * إدراج إيموجي
   */
  insertEmoji(emoji) {
    const input = document.getElementById('messageInput');
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    
    input.value = text.substring(0, start) + emoji + text.substring(end);
    input.focus();
    input.selectionStart = input.selectionEnd = start + emoji.length;
    
    this.toggleEmojiPicker();
  },

  /**
   * تبديل ملء الشاشة
   */
  toggleFullscreen() {
    const mainContent = document.querySelector('.main-content');
    
    if (!document.fullscreenElement) {
      mainContent.requestFullscreen().catch(err => {
        console.error('خطأ في ملء الشاشة:', err);
      });
    } else {
      document.exitFullscreen();
    }
  },

  /**
   * تحديث الإحصائيات
   */
  updateStats(duration) {
    const stats = Storage.getStats();
    
    stats.questionsCount++;
    stats.pointsCount += 10;
    stats.totalTime += duration;
    
    // تحديث المستوى
    const newLevel = Math.floor(stats.pointsCount / 100) + 1;
    if (newLevel > stats.learningLevel) {
      stats.learningLevel = newLevel;
      Notification.show(`تهانينا! وصلت إلى المستوى ${newLevel}`, 'success');
      Utils.playSound(800, 200);
    }
    
    // تحديث السلسلة
    const today = new Date().toDateString();
    const lastVisit = stats.lastVisit ? new Date(stats.lastVisit).toDateString() : null;
    
    if (lastVisit !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();
      
      if (lastVisit === yesterdayStr) {
        stats.streakCount++;
      } else if (lastVisit !== today) {
        stats.streakCount = 1;
      }
    }
    
    stats.lastVisit = new Date().toISOString();
    
    Storage.saveStats(stats);
    this.displayStats();
    this.checkBadges(stats);
  },

  /**
   * عرض الإحصائيات
   */
  displayStats() {
    const stats = Storage.getStats();
    
    if (document.getElementById('questionsCount'))
      document.getElementById('questionsCount').textContent = stats.questionsCount;
    if (document.getElementById('learningLevel'))
      document.getElementById('learningLevel').textContent = stats.learningLevel;
    if (document.getElementById('pointsCount'))
      document.getElementById('pointsCount').textContent = stats.pointsCount;
    if (document.getElementById('streakCount'))
      document.getElementById('streakCount').textContent = stats.streakCount;
    
    const totalMinutes = Math.floor(stats.totalTime / 60);
    if (document.getElementById('totalTime'))
      document.getElementById('totalTime').textContent = totalMinutes + 'د';
    const progress = Math.min((stats.pointsCount % 100), 100);
    if (document.getElementById('progressBar'))
      document.getElementById('progressBar').style.width = progress + '%';
    if (document.getElementById('progressText'))
      document.getElementById('progressText').textContent = progress + '%';
  },

  /**
   * التحقق من الشارات
   */
  checkBadges(stats) {
    const currentBadges = Storage.getBadges();
    
    CONFIG.badges.forEach(badge => {
      if (stats.pointsCount >= badge.requirement && !currentBadges.includes(badge.id)) {
        Storage.addBadge(badge.id);
        this.displayBadges();
        Notification.show(`حصلت على شارة جديدة: ${badge.name} ${badge.icon}`, 'success');
        Utils.playSound(1000, 300);
      }
    });
  },

  /**
   * عرض الشارات
   */
  displayBadges() {
    const badgesContainer = document.getElementById('badgesContainer');
    if (!badgesContainer) return;
    const userBadges = Storage.getBadges();
    
    badgesContainer.innerHTML = '';
    
    userBadges.forEach(badgeId => {
      const badge = CONFIG.badges.find(b => b.id === badgeId);
      if (badge) {
        const badgeElement = document.createElement('span');
        badgeElement.className = 'badge';
        badgeElement.innerHTML = `${badge.icon} ${badge.name}`;
        badgesContainer.appendChild(badgeElement);
      }
    });
  },

  /**
   * حفظ الرسائل
   */
  saveMessages() {
    Storage.saveMessages(this.messages);
  },

  /**
   * تحميل الرسائل
   */
  loadMessages() {
    this.messages = Storage.getMessages();
    this.renderMessages();
    this.displayStats();
    this.displayBadges();
  },

  /**
   * عرض جميع الرسائل
   */
  renderMessages() {
    const chatbox = document.getElementById('chatMessages');
    chatbox.innerHTML = '';
    
    if (this.messages.length === 0) {
      chatbox.innerHTML = `
        <div class="welcome-message">
          <div class="welcome-icon">🎓</div>
          <h2>مرحباً بك في نبراس!</h2>
          <p>منصة التعلم الذكية المدعومة بالذكاء الاصطناعي</p>
          <div class="quick-actions">
            <button class="quick-btn" onclick="sendQuickMessage('ما هو الذكاء الاصطناعي؟')">
              <i class="fas fa-robot"></i> ما هو الذكاء الاصطناعي؟
            </button>
            <button class="quick-btn" onclick="sendQuickMessage('كيف أبدأ تعلم البرمجة؟')">
              <i class="fas fa-code"></i> كيف أبدأ تعلم البرمجة؟
            </button>
            <button class="quick-btn" onclick="sendQuickMessage('أريد تحدياً في الرياضيات')">
              <i class="fas fa-calculator"></i> تحدي في الرياضيات
            </button>
          </div>
        </div>
      `;
    } else {
      this.messages.forEach(message => this.renderMessage(message));
    }
  }
};

// وظائف عامة
function sendQuickMessage(message) {
  const input = document.getElementById('messageInput');
  input.value = message;
  Chat.sendMessage();
}

function closeModal() {
  const modal = document.getElementById('imageModal');
  modal.classList.remove('active');
}

function insertEmoji(emoji) {
  Chat.insertEmoji(emoji);
}

// إغلاق منتقي الإيموجي عند النقر خارجه
document.addEventListener('click', (e) => {
  const picker = document.getElementById('emojiPicker');
  const emojiBtn = document.getElementById('emojiBtn');
  
  if (picker && !picker.contains(e.target) && e.target !== emojiBtn && !emojiBtn.contains(e.target)) {
    picker.style.display = 'none';
  }
});

/** تحسين متقدم: نظام حماية شامل وتهيئة آمنة */
(function initializeNebras() {
  'use strict';

  Logger.info('Initializing Nebras application...');

  // Enhanced global protection
  if (!window._nebrasGlobalsInjected) {
    window._nebrasGlobalsInjected = true;

    // Secure global object injection
    const globals = {
      Utils, Storage, Modes, AI, Lab, Library, Challenges, Analytics, Settings, Chat,
      ValidationError, NetworkError, SecurityError, SecurityUtils, Logger, PerformanceMonitor
    };

    Object.entries(globals).forEach(([name, obj]) => {
      if (!window[name]) {
        Object.defineProperty(window, name, {
          value: obj,
          writable: false,
          configurable: false,
          enumerable: true
        });
      }
    });
  }

  // Enhanced global functions with error handling
  const globalFunctions = {
    switchMode: (modeId) => {
      try {
        if (typeof modeId !== 'string') throw new ValidationError('Invalid mode ID', 'modeId');
        Modes.switchMode(modeId);
      } catch (err) {
        Logger.error('Error switching mode:', err);
        Notification.show('خطأ في تبديل الوضع', 'error');
      }
    },

    startLearning: () => {
      try {
        Modes.startLearning();
      } catch (err) {
        Logger.error('Error starting learning:', err);
        Notification.show('خطأ في بدء التعلم', 'error');
      }
    },

    loadSevenCodeContent: async () => {
      try {
        const message = `أخبرني عن قناة SEVEN_CODE7 على يوتيوب وما هي أنواع المحتوى التعليمي الذي تقدمه في مجال البرمجة والتقنية.`;
        const messageInput = Utils.getElement('#messageInput');
        if (messageInput) {
          messageInput.value = message;
          await Chat.sendMessage();
        }
      } catch (err) {
        Logger.error('Error loading Seven Code content:', err);
        Notification.show('خطأ في تحميل المحتوى', 'error');
      }
    },

    changeTheme: (theme) => {
      try {
        if (!['light', 'dark', 'auto'].includes(theme)) {
          throw new ValidationError('Invalid theme', 'theme');
        }
        const settings = Storage.getSettings();
        settings.theme = theme;
        Storage.saveSettings(settings);
        Settings.applyTheme(theme);
        Logger.info(`Theme changed to: ${theme}`);
      } catch (err) {
        Logger.error('Error changing theme:', err);
      }
    },

    changePrimaryColor: (color) => {
      try {
        if (!/^#[0-9A-F]{6}$/i.test(color)) {
          throw new ValidationError('Invalid color format', 'color');
        }
        Settings.applyPrimaryColor(color);
        Logger.info(`Primary color changed to: ${color}`);
      } catch (err) {
        Logger.error('Error changing primary color:', err);
      }
    },

    changeFontSize: (size) => {
      try {
        if (!['small', 'medium', 'large'].includes(size)) {
          throw new ValidationError('Invalid font size', 'size');
        }
        Settings.applyFontSize(size);
        Logger.info(`Font size changed to: ${size}`);
      } catch (err) {
        Logger.error('Error changing font size:', err);
      }
    },

    toggleNotifications: (enabled) => {
      try {
        const settings = Storage.getSettings();
        settings.notificationsEnabled = Boolean(enabled);
        Storage.saveSettings(settings);
        Logger.info(`Notifications ${enabled ? 'enabled' : 'disabled'}`);
      } catch (err) {
        Logger.error('Error toggling notifications:', err);
      }
    },

    toggleSound: (enabled) => {
      try {
        const settings = Storage.getSettings();
        settings.soundEnabled = Boolean(enabled);
        Storage.saveSettings(settings);
        Logger.info(`Sound ${enabled ? 'enabled' : 'disabled'}`);
      } catch (err) {
        Logger.error('Error toggling sound:', err);
      }
    },

    changeDetailLevel: (level) => {
      try {
        if (!['low', 'medium', 'high'].includes(level)) {
          throw new ValidationError('Invalid detail level', 'level');
        }
        const settings = Storage.getSettings();
        settings.detailLevel = level;
        Storage.saveSettings(settings);
        Logger.info(`Detail level changed to: ${level}`);
      } catch (err) {
        Logger.error('Error changing detail level:', err);
      }
    },

    saveSettings: () => {
      try {
        Settings.saveSettings();
        Notification.show('تم حفظ الإعدادات بنجاح', 'success');
      } catch (err) {
        Logger.error('Error saving settings:', err);
        Notification.show('خطأ في حفظ الإعدادات', 'error');
      }
    },

    resetSettings: () => {
      try {
        Settings.resetSettings();
      } catch (err) {
        Logger.error('Error resetting settings:', err);
        Notification.show('خطأ في إعادة تعيين الإعدادات', 'error');
      }
    },

    closeSettings: () => {
      try {
        Settings.closeSettings();
      } catch (err) {
        Logger.error('Error closing settings:', err);
      }
    },

    sendQuickMessage: async (message) => {
      try {
        if (typeof message !== 'string' || !message.trim()) {
          throw new ValidationError('Invalid message', 'message');
        }
        const input = Utils.getElement('#messageInput');
        if (input) {
          input.value = SecurityUtils.sanitizeInput(message);
          await Chat.sendMessage();
        }
      } catch (err) {
        Logger.error('Error sending quick message:', err);
        Notification.show('خطأ في إرسال الرسالة', 'error');
      }
    },

    closeModal: () => {
      try {
        const modal = Utils.getElement('#imageModal');
        if (modal) modal.classList.remove('active');
      } catch (err) {
        Logger.error('Error closing modal:', err);
      }
    },

    insertEmoji: (emoji) => {
      try {
        if (typeof emoji !== 'string' || emoji.length === 0) {
          throw new ValidationError('Invalid emoji', 'emoji');
        }
        Chat.insertEmoji(emoji);
      } catch (err) {
        Logger.error('Error inserting emoji:', err);
      }
    }
  };

  // Secure function injection
  Object.entries(globalFunctions).forEach(([name, fn]) => {
    if (typeof window[name] !== 'function') {
      Object.defineProperty(window, name, {
        value: fn,
        writable: false,
        configurable: false,
        enumerable: true
      });
    }
  });

  // Initialize application
  document.addEventListener('DOMContentLoaded', () => {
    try {
      Logger.info('DOM loaded, initializing components...');

      // Initialize modules in correct order with safety checks
      if (typeof Settings.init === 'function') {
        Settings.init();
        Logger.debug('Settings initialized');
      }

      if (typeof Chat.init === 'function') {
        Chat.init();
        Logger.debug('Chat initialized');
      }

      if (typeof Modes.init === 'function') {
        Modes.init();
        Logger.debug('Modes initialized');
      }

      // Initialize other modules if their init methods exist
      if (typeof Lab.init === 'function') {
        Lab.init();
        Logger.debug('Lab initialized');
      }

      if (typeof Library.init === 'function') {
        Library.init();
        Logger.debug('Library initialized');
      }

      if (typeof Challenges.init === 'function') {
        Challenges.init();
        Logger.debug('Challenges initialized');
      }

      if (typeof Analytics.init === 'function') {
        Analytics.init();
        Logger.debug('Analytics initialized');
      }

      // Performance monitoring
      if ('performance' in window && 'PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.entryType === 'measure') {
                Logger.debug(`Performance: ${entry.name} - ${entry.duration}ms`);
              }
            }
          });
          observer.observe({ entryTypes: ['measure'] });
          Logger.debug('Performance monitoring initialized');
        } catch (perfErr) {
          Logger.warn('Performance monitoring failed:', perfErr);
        }
      }

      Logger.info('Nebras application initialized successfully');

      // Hide loading screen after successful initialization
      const loadingScreen = document.getElementById('loadingScreen');
      if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
          loadingScreen.style.display = 'none';
          Logger.debug('Loading screen hidden');
        }, 500); // Smooth fade out
      }

      if (typeof Notification !== 'undefined' && Notification.show) {
        Notification.show('تم تحميل نبراس بنجاح', 'success');
      }

    } catch (err) {
      Logger.error('Error during initialization:', err);
      console.error('Critical error during Nebras initialization:', err);

      // Hide loading screen even on error
      const loadingScreen = document.getElementById('loadingScreen');
      if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
          loadingScreen.style.display = 'none';
        }, 500);
      }

      // Fallback notification using console
      console.log('⚠️ تحذير: فشل في تهيئة بعض مكونات نبراس. قد لا تعمل بعض الميزات بشكل صحيح.');
    }
  });

  // Global error handling
  window.addEventListener('error', (event) => {
    Logger.error('Global error:', {
      message: event.message,
      source: event.filename,
      line: event.lineno,
      column: event.colno,
      error: event.error
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    Logger.error('Unhandled promise rejection:', event.reason);
  });

})();

/** تحسينات تقنية قوية إضافية */
(function enhanceTechnicalSecurity() {
  'use strict';
  // جعل الكائنات العامة غير قابلة للكتابة
  [
    'Utils', 'Storage', 'Modes', 'AI', 'Lab', 'Library', 'Challenges', 'Analytics', 'Settings', 'Chat'
  ].forEach(function(name) {
    if (window[name] && typeof window[name] === 'object') {
      Object.freeze(window[name]);
      Object.defineProperty(window, name, { writable: false, configurable: false });
    }
  });
  // تحسين إضافي: منع تكرار مراقبة الأخطاء
  if (!window._nebrasErrorHandlerInjected) {
    window._nebrasErrorHandlerInjected = true;
    window.onerror = function(message, source, lineno, colno, error) {
      try {
        const errorLog = Storage.get(CONFIG.storage.keys.errorLogs, []);
        errorLog.push({
          message, source, lineno, colno, error: error ? error.stack : '', timestamp: new Date().toISOString()
        });
        Storage.set(CONFIG.storage.keys.errorLogs, errorLog);
      } catch(e) {}
    };
  }
  // تحسين إضافي: حماية الكائنات العامة عبر Object.seal
  [
    'Utils', 'Storage', 'Modes', 'AI', 'Lab', 'Library', 'Challenges', 'Analytics', 'Settings', 'Chat'
  ].forEach(function(name) {
    if (window[name] && typeof window[name] === 'object') {
      Object.seal(window[name]);
    }
  });
  // تحسين إضافي: منع تكرار مراقبة الذاكرة
  if (!window._nebrasMemoryMonitorInjected && window.performance && window.performance.memory && document.getElementById('analyticsMemory')) {
    window._nebrasMemoryMonitorInjected = true;
    setInterval(function() {
      const mem = window.performance.memory;
      document.getElementById('analyticsMemory').textContent =
        `Memory: ${(mem.usedJSHeapSize/1048576).toFixed(1)}MB / ${(mem.totalJSHeapSize/1048576).toFixed(1)}MB`;
    }, 2000);
  }
  // نهاية دالة الحماية التقنية
})();



// نهاية دالة الحماية التقنية
})();


/* ===[ NEBRAS PATCH TAIL v5 ]=========================================== */
(function(){ 'use strict';
  // 1) Safe binding for theme toggle if not already wired
  document.addEventListener('DOMContentLoaded', function(){
    try{
      var themeBtn = document.getElementById('themeBtn');
      if (themeBtn && window.Settings && typeof Settings.toggleTheme === 'function') {
        if (!themeBtn.__nebToggleBound) {
          themeBtn.addEventListener('click', function(){ try{ Settings.toggleTheme(); }catch(e){ console.error(e); } });
          themeBtn.__nebToggleBound = true;
        }
      }
    }catch(e){ console.warn('Theme bind fallback error', e); }
  });

  // 2) Robust modes switching via delegation if HTML lacks inline handlers
  document.addEventListener('click', function(ev){
    var el = ev.target && (ev.target.closest ? ev.target.closest('[data-mode]') : null);
    if (!el) return;
    var modeId = el.getAttribute('data-mode');
    if (!modeId) return;
    try{
      if (window.Modes && typeof Modes.switchMode === 'function') {
        Modes.switchMode(modeId);
      } else if (window.Modes && typeof Modes.setActive === 'function') {
        Modes.setActive(modeId);
      }
      Notification.show('تم التحويل إلى وضع: ' + (el.textContent||modeId), 'info');
    }catch(e){ console.error('Mode switch fallback error', e); }
  }, true);

  // 3) Coerce Chat messages to string to prevent [object Object]
  try{
    if (window.Chat){
      // Patch addMessage
      if (typeof Chat.addMessage === 'function' && !Chat.__patchedAdd) {
        var _add = Chat.addMessage.bind(Chat);
        Chat.addMessage = function(role, text, images){
          try{
            if (text && typeof text === 'object') {
              text = (text.text || text.message || JSON.stringify(text));
            }
            text = String(text || '');
          } catch(_) { text = ''; }
          return _add(role, text, images || []);
        };
        Chat.__patchedAdd = true;
      }
      // Patch renderMessage text coercion
      if (typeof Chat.renderMessage === 'function' && !Chat.__patchedRender) {
        var _render = Chat.renderMessage.bind(Chat);
        Chat.renderMessage = function(message){
          if (message && typeof message.text === 'object') {
            try{ message.text = (message.text.text || message.text.message || JSON.stringify(message.text)); }
            catch(_){ message.text = String(message.text); }
          }
          return _render(message);
        };
        Chat.__patchedRender = true;
      }
    }
  } catch(e){ console.warn('Chat coercion patch error', e); }

  // 4) Loader safety: always hide after load and after 2.5s timeout
  (function(){
    var hide = function(){
      var el = document.getElementById('loading');
      if (el) el.classList.add('hidden');
      var el2 = document.getElementById('loadingScreen');
      if (el2){ el2.style.opacity='0'; setTimeout(function(){ el2.style.display='none'; }, 350); }
    };
    window.addEventListener('load', hide, { once:true });
    setTimeout(hide, 2500);
  })();
})();
/* ===================================================================== */
