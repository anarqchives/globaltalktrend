import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export type LangCode = "pt" | "en" | "es" | "fr" | "de" | "it" | "zh" | "ja" | "ko" | "ar" | "hi" | "ru";

export const languages: { code: LangCode; label: string; name: string }[] = [
  { code: "pt", label: "PT", name: "Português" },
  { code: "en", label: "EN", name: "English" },
  { code: "es", label: "ES", name: "Español" },
  { code: "fr", label: "FR", name: "Français" },
  { code: "de", label: "DE", name: "Deutsch" },
  { code: "it", label: "IT", name: "Italiano" },
  { code: "zh", label: "中文", name: "中文" },
  { code: "ja", label: "日本", name: "日本語" },
  { code: "ko", label: "한국", name: "한국어" },
  { code: "ar", label: "عربي", name: "العربية" },
  { code: "hi", label: "हिंदी", name: "हिंदी" },
  { code: "ru", label: "RU", name: "Русский" },
];

type TranslationKey =
  | "trends" | "moreTrends" | "filters" | "country" | "period" | "category" | "type"
  | "global" | "lastHour" | "today" | "thisWeek" | "thisMonth"
  | "all" | "politics" | "entertainment" | "technology" | "sports" | "culture" | "business" | "science"
  | "allMedia" | "socialMedia" | "press" | "searches"
  | "live" | "peak" | "copied" | "updated" | "about" | "aboutTitle" | "aboutDesc"
  | "map" | "satellite" | "terrain" | "timeline" | "clickToClose"
  | "trendCount" | "loading" | "expandDetails" | "evolution24h" | "share" | "noTrends"
  | "heatmapDensity" | "low" | "high"
  | "views" | "upvotes" | "comments" | "interactions" | "likes"
  | "officialSource" | "scientific" | "international" | "localPress"
  | "watchOn" | "viewOn" | "readOn" | "viewSource" | "summarizeAI" | "analyzing"
  | "aiSummary" | "impactHigh" | "impactMedium" | "impactLow";

const translations: Record<LangCode, Record<TranslationKey, string>> = {
  pt: {
    trends: "Tendências", moreTrends: "Mais trends", filters: "Filtros",
    country: "País", period: "Período", category: "Categoria", type: "Tipo",
    global: "Global", lastHour: "Última hora", today: "Hoje", thisWeek: "Esta semana", thisMonth: "Este mês",
    all: "Todas", politics: "Política", entertainment: "Entretenimento", technology: "Tecnologia",
    sports: "Esportes", culture: "Cultura", business: "Negócios/Finanças", science: "Ciência",
    allMedia: "Todas mídias", socialMedia: "Redes sociais", press: "Imprensa", searches: "Buscas (Google)",
    live: "ao vivo", peak: "PICO", copied: "Copiado!", updated: "Atualizado",
    about: "Sobre", aboutTitle: "Global-Talk-Trending",
    aboutDesc: "Monitor de tendências globais em tempo real. Agregamos dados do YouTube, Reddit, Google Trends e NewsAPI para oferecer uma visão completa do que está em alta no mundo.",
    map: "Mapa", satellite: "Satélite", terrain: "Terreno", timeline: "Timeline",
    clickToClose: "Clique para fechar", trendCount: "trends", loading: "Carregando...",
    expandDetails: "Ver detalhes", evolution24h: "Evolução 24h", share: "Compartilhar", noTrends: "Sem tendências",
    heatmapDensity: "Densidade de Trends", low: "Baixo", high: "Alto",
    views: "visualizações", upvotes: "upvotes", comments: "comentários", interactions: "interações", likes: "curtidas",
    officialSource: "Fonte Oficial", scientific: "Acadêmico/Científico", international: "Internacional", localPress: "Imprensa",
    watchOn: "Assistir no", viewOn: "Ver no", readOn: "Ler no", viewSource: "Ver fonte original", summarizeAI: "Resumir com IA", analyzing: "Analisando...",
    aiSummary: "Resumo IA", impactHigh: "Alto", impactMedium: "Médio", impactLow: "Baixo",
  },
  en: {
    trends: "Trends", moreTrends: "More trends", filters: "Filters",
    country: "Country", period: "Period", category: "Category", type: "Type",
    global: "Global", lastHour: "Last hour", today: "Today", thisWeek: "This week", thisMonth: "This month",
    all: "All", politics: "Politics", entertainment: "Entertainment", technology: "Technology",
    sports: "Sports", culture: "Culture", business: "Business/Finance", science: "Science",
    allMedia: "All media", socialMedia: "Social media", press: "Press", searches: "Search (Google)",
    live: "live", peak: "PEAK", copied: "Copied!", updated: "Updated",
    about: "About", aboutTitle: "Global-Talk-Trending",
    aboutDesc: "Real-time global trends monitor. We aggregate data from YouTube, Reddit, Google Trends, and NewsAPI to provide a complete view of what's trending worldwide.",
    map: "Map", satellite: "Satellite", terrain: "Terrain", timeline: "Timeline",
    clickToClose: "Click to close", trendCount: "trends", loading: "Loading...",
    expandDetails: "View details", evolution24h: "24h Evolution", share: "Share", noTrends: "No trends",
    heatmapDensity: "Trend Density", low: "Low", high: "High",
    views: "views", upvotes: "upvotes", comments: "comments", interactions: "interactions", likes: "likes",
    officialSource: "Official Source", scientific: "Academic/Scientific", international: "International", localPress: "Press",
    watchOn: "Watch on", viewOn: "View on", readOn: "Read on", viewSource: "View original source", summarizeAI: "Summarize with AI", analyzing: "Analyzing...",
    aiSummary: "AI Summary", impactHigh: "High", impactMedium: "Medium", impactLow: "Low",
  },
  es: {
    trends: "Tendencias", moreTrends: "Más trends", filters: "Filtros",
    country: "País", period: "Período", category: "Categoría", type: "Tipo",
    global: "Global", lastHour: "Última hora", today: "Hoy", thisWeek: "Esta semana", thisMonth: "Este mes",
    all: "Todas", politics: "Política", entertainment: "Entretenimiento", technology: "Tecnología",
    sports: "Deportes", culture: "Cultura", business: "Negocios/Finanzas", science: "Ciencia",
    allMedia: "Todos los medios", socialMedia: "Redes sociales", press: "Prensa", searches: "Búsquedas (Google)",
    live: "en vivo", peak: "PICO", copied: "¡Copiado!", updated: "Actualizado",
    about: "Acerca de", aboutTitle: "Global-Talk-Trending",
    aboutDesc: "Monitor de tendencias globales en tiempo real. Agregamos datos de YouTube, Reddit, Google Trends y NewsAPI.",
    map: "Mapa", satellite: "Satélite", terrain: "Terreno", timeline: "Timeline",
    clickToClose: "Clic para cerrar", trendCount: "tendencias", loading: "Cargando...",
    expandDetails: "Ver detalles", evolution24h: "Evolución 24h", share: "Compartir", noTrends: "Sin tendencias",
    heatmapDensity: "Densidad de Trends", low: "Bajo", high: "Alto",
    views: "visualizaciones", upvotes: "upvotes", comments: "comentarios", interactions: "interacciones", likes: "me gusta",
    officialSource: "Fuente Oficial", scientific: "Académico/Científico", international: "Internacional", localPress: "Prensa",
    watchOn: "Ver en", viewOn: "Ver en", readOn: "Leer en", viewSource: "Ver fuente original", summarizeAI: "Resumir con IA", analyzing: "Analizando...",
    aiSummary: "Resumen IA", impactHigh: "Alto", impactMedium: "Medio", impactLow: "Bajo",
  },
  fr: {
    trends: "Tendances", moreTrends: "Plus de tendances", filters: "Filtres",
    country: "Pays", period: "Période", category: "Catégorie", type: "Type",
    global: "Mondial", lastHour: "Dernière heure", today: "Aujourd'hui", thisWeek: "Cette semaine", thisMonth: "Ce mois",
    all: "Toutes", politics: "Politique", entertainment: "Divertissement", technology: "Technologie",
    sports: "Sports", culture: "Culture", business: "Affaires/Finance", science: "Science",
    allMedia: "Tous les médias", socialMedia: "Réseaux sociaux", press: "Presse", searches: "Recherches (Google)",
    live: "en direct", peak: "PIC", copied: "Copié !", updated: "Mis à jour",
    about: "À propos", aboutTitle: "Global-Talk-Trending",
    aboutDesc: "Moniteur de tendances mondiales en temps réel. Nous agrégeons des données de YouTube, Reddit, Google Trends et NewsAPI.",
    map: "Carte", satellite: "Satellite", terrain: "Terrain", timeline: "Timeline",
    clickToClose: "Cliquer pour fermer", trendCount: "tendances", loading: "Chargement...",
    expandDetails: "Voir les détails", evolution24h: "Évolution 24h", share: "Partager", noTrends: "Aucune tendance",
    heatmapDensity: "Densité des Trends", low: "Faible", high: "Élevé",
    views: "vues", upvotes: "upvotes", comments: "commentaires", interactions: "interactions", likes: "j'aime",
    officialSource: "Source Officielle", scientific: "Académique/Scientifique", international: "International", localPress: "Presse",
    watchOn: "Regarder sur", viewOn: "Voir sur", readOn: "Lire sur", viewSource: "Voir source originale", summarizeAI: "Résumer avec IA", analyzing: "Analyse...",
    aiSummary: "Résumé IA", impactHigh: "Élevé", impactMedium: "Moyen", impactLow: "Faible",
  },
  de: {
    trends: "Trends", moreTrends: "Mehr Trends", filters: "Filter",
    country: "Land", period: "Zeitraum", category: "Kategorie", type: "Typ",
    global: "Global", lastHour: "Letzte Stunde", today: "Heute", thisWeek: "Diese Woche", thisMonth: "Diesen Monat",
    all: "Alle", politics: "Politik", entertainment: "Unterhaltung", technology: "Technologie",
    sports: "Sport", culture: "Kultur", business: "Wirtschaft/Finanzen", science: "Wissenschaft",
    allMedia: "Alle Medien", socialMedia: "Soziale Medien", press: "Presse", searches: "Suche (Google)",
    live: "live", peak: "PEAK", copied: "Kopiert!", updated: "Aktualisiert",
    about: "Über", aboutTitle: "Global-Talk-Trending",
    aboutDesc: "Echtzeit-Monitor für globale Trends. Wir aggregieren Daten von YouTube, Reddit, Google Trends und NewsAPI.",
    map: "Karte", satellite: "Satellit", terrain: "Gelände", timeline: "Timeline",
    clickToClose: "Klicken zum Schließen", trendCount: "Trends", loading: "Laden...",
    expandDetails: "Details anzeigen", evolution24h: "24h-Entwicklung", share: "Teilen", noTrends: "Keine Trends",
    heatmapDensity: "Trend-Dichte", low: "Niedrig", high: "Hoch",
    views: "Aufrufe", upvotes: "Upvotes", comments: "Kommentare", interactions: "Interaktionen", likes: "Likes",
    officialSource: "Offizielle Quelle", scientific: "Akademisch/Wissenschaftlich", international: "International", localPress: "Presse",
    watchOn: "Ansehen auf", viewOn: "Ansehen auf", readOn: "Lesen auf", viewSource: "Originalquelle ansehen", summarizeAI: "Mit KI zusammenfassen", analyzing: "Analyse...",
    aiSummary: "KI-Zusammenfassung", impactHigh: "Hoch", impactMedium: "Mittel", impactLow: "Niedrig",
  },
  it: {
    trends: "Tendenze", moreTrends: "Più tendenze", filters: "Filtri",
    country: "Paese", period: "Periodo", category: "Categoria", type: "Tipo",
    global: "Globale", lastHour: "Ultima ora", today: "Oggi", thisWeek: "Questa settimana", thisMonth: "Questo mese",
    all: "Tutte", politics: "Politica", entertainment: "Intrattenimento", technology: "Tecnologia",
    sports: "Sport", culture: "Cultura", business: "Affari/Finanza", science: "Scienza",
    allMedia: "Tutti i media", socialMedia: "Social media", press: "Stampa", searches: "Ricerche (Google)",
    live: "in diretta", peak: "PICCO", copied: "Copiato!", updated: "Aggiornato",
    about: "Info", aboutTitle: "Global-Talk-Trending",
    aboutDesc: "Monitor di tendenze globali in tempo reale. Aggreghiamo dati da YouTube, Reddit, Google Trends e NewsAPI.",
    map: "Mappa", satellite: "Satellite", terrain: "Terreno", timeline: "Timeline",
    clickToClose: "Clicca per chiudere", trendCount: "tendenze", loading: "Caricamento...",
    expandDetails: "Vedi dettagli", evolution24h: "Evoluzione 24h", share: "Condividi", noTrends: "Nessuna tendenza",
    heatmapDensity: "Densità dei Trend", low: "Basso", high: "Alto",
    views: "visualizzazioni", upvotes: "upvotes", comments: "commenti", interactions: "interazioni", likes: "mi piace",
    officialSource: "Fonte Ufficiale", scientific: "Accademico/Scientifico", international: "Internazionale", localPress: "Stampa",
    watchOn: "Guarda su", viewOn: "Vedi su", readOn: "Leggi su", viewSource: "Vedi fonte originale", summarizeAI: "Riassumi con IA", analyzing: "Analisi...",
    aiSummary: "Riassunto IA", impactHigh: "Alto", impactMedium: "Medio", impactLow: "Basso",
  },
  zh: {
    trends: "趋势", moreTrends: "更多趋势", filters: "筛选",
    country: "国家", period: "时段", category: "类别", type: "类型",
    global: "全球", lastHour: "最近一小时", today: "今天", thisWeek: "本周", thisMonth: "本月",
    all: "全部", politics: "政治", entertainment: "娱乐", technology: "科技",
    sports: "体育", culture: "文化", business: "商业/金融", science: "科学",
    allMedia: "所有媒体", socialMedia: "社交媒体", press: "新闻", searches: "搜索 (Google)",
    live: "直播", peak: "峰值", copied: "已复制！", updated: "已更新",
    about: "关于", aboutTitle: "Global-Talk-Trending",
    aboutDesc: "实时全球趋势监控器。我们汇总来自YouTube、Reddit、Google Trends和NewsAPI的数据。",
    map: "地图", satellite: "卫星", terrain: "地形", timeline: "时间线",
    clickToClose: "点击关闭", trendCount: "趋势", loading: "加载中...",
    expandDetails: "查看详情", evolution24h: "24小时演变", share: "分享", noTrends: "无趋势",
    heatmapDensity: "趋势密度", low: "低", high: "高",
    views: "浏览量", upvotes: "点赞", comments: "评论", interactions: "互动", likes: "喜欢",
    officialSource: "官方来源", scientific: "学术/科学", international: "国际", localPress: "新闻媒体",
    watchOn: "观看于", viewOn: "查看于", readOn: "阅读于", viewSource: "查看原始来源", summarizeAI: "AI总结", analyzing: "分析中...",
    aiSummary: "AI摘要", impactHigh: "高", impactMedium: "中", impactLow: "低",
  },
  ja: {
    trends: "トレンド", moreTrends: "もっと見る", filters: "フィルター",
    country: "国", period: "期間", category: "カテゴリー", type: "タイプ",
    global: "グローバル", lastHour: "直近1時間", today: "今日", thisWeek: "今週", thisMonth: "今月",
    all: "すべて", politics: "政治", entertainment: "エンタメ", technology: "テクノロジー",
    sports: "スポーツ", culture: "文化", business: "ビジネス/金融", science: "科学",
    allMedia: "全メディア", socialMedia: "SNS", press: "報道", searches: "検索 (Google)",
    live: "ライブ", peak: "ピーク", copied: "コピーしました！", updated: "更新済み",
    about: "について", aboutTitle: "Global-Talk-Trending",
    aboutDesc: "リアルタイムのグローバルトレンドモニター。YouTube、Reddit、Google Trends、NewsAPIからのデータを集約しています。",
    map: "マップ", satellite: "衛星", terrain: "地形", timeline: "タイムライン",
    clickToClose: "クリックして閉じる", trendCount: "トレンド", loading: "読み込み中...",
    expandDetails: "詳細を見る", evolution24h: "24時間の推移", share: "共有", noTrends: "トレンドなし",
    heatmapDensity: "トレンド密度", low: "低", high: "高",
    views: "再生回数", upvotes: "アップボート", comments: "コメント", interactions: "インタラクション", likes: "いいね",
    officialSource: "公式情報", scientific: "学術/科学", international: "国際", localPress: "報道",
    watchOn: "で視聴", viewOn: "で見る", readOn: "で読む", viewSource: "元の情報源を見る", summarizeAI: "AIで要約", analyzing: "分析中...",
    aiSummary: "AI要約", impactHigh: "高", impactMedium: "中", impactLow: "低",
  },
  ko: {
    trends: "트렌드", moreTrends: "더 많은 트렌드", filters: "필터",
    country: "국가", period: "기간", category: "카테고리", type: "유형",
    global: "글로벌", lastHour: "지난 1시간", today: "오늘", thisWeek: "이번 주", thisMonth: "이번 달",
    all: "전체", politics: "정치", entertainment: "엔터테인먼트", technology: "기술",
    sports: "스포츠", culture: "문화", business: "비즈니스/금융", science: "과학",
    allMedia: "모든 미디어", socialMedia: "소셜 미디어", press: "언론", searches: "검색 (Google)",
    live: "실시간", peak: "피크", copied: "복사됨!", updated: "업데이트됨",
    about: "소개", aboutTitle: "Global-Talk-Trending",
    aboutDesc: "실시간 글로벌 트렌드 모니터. YouTube, Reddit, Google Trends, NewsAPI의 데이터를 집계합니다.",
    map: "지도", satellite: "위성", terrain: "지형", timeline: "타임라인",
    clickToClose: "닫으려면 클릭", trendCount: "트렌드", loading: "로딩 중...",
    expandDetails: "상세 보기", evolution24h: "24시간 추이", share: "공유", noTrends: "트렌드 없음",
    heatmapDensity: "트렌드 밀도", low: "낮음", high: "높음",
    views: "조회수", upvotes: "추천", comments: "댓글", interactions: "상호작용", likes: "좋아요",
    officialSource: "공식 출처", scientific: "학술/과학", international: "국제", localPress: "언론",
    watchOn: "에서 시청", viewOn: "에서 보기", readOn: "에서 읽기", viewSource: "원본 소스 보기", summarizeAI: "AI로 요약", analyzing: "분석 중...",
    aiSummary: "AI 요약", impactHigh: "높음", impactMedium: "중간", impactLow: "낮음",
  },
  ar: {
    trends: "الاتجاهات", moreTrends: "المزيد", filters: "التصفية",
    country: "البلد", period: "الفترة", category: "الفئة", type: "النوع",
    global: "عالمي", lastHour: "الساعة الأخيرة", today: "اليوم", thisWeek: "هذا الأسبوع", thisMonth: "هذا الشهر",
    all: "الكل", politics: "سياسة", entertainment: "ترفيه", technology: "تكنولوجيا",
    sports: "رياضة", culture: "ثقافة", business: "أعمال/مالية", science: "علوم",
    allMedia: "جميع الوسائط", socialMedia: "وسائل التواصل", press: "صحافة", searches: "بحث (Google)",
    live: "مباشر", peak: "ذروة", copied: "تم النسخ!", updated: "تم التحديث",
    about: "حول", aboutTitle: "Global-Talk-Trending",
    aboutDesc: "مراقب الاتجاهات العالمية في الوقت الفعلي.",
    map: "خريطة", satellite: "قمر صناعي", terrain: "تضاريس", timeline: "الجدول الزمني",
    clickToClose: "اضغط للإغلاق", trendCount: "اتجاهات", loading: "جار التحميل...",
    expandDetails: "عرض التفاصيل", evolution24h: "التطور 24 ساعة", share: "مشاركة", noTrends: "لا توجد اتجاهات",
    heatmapDensity: "كثافة الاتجاهات", low: "منخفض", high: "مرتفع",
    views: "مشاهدات", upvotes: "تصويت", comments: "تعليقات", interactions: "تفاعلات", likes: "إعجابات",
    officialSource: "مصدر رسمي", scientific: "أكاديمي/علمي", international: "دولي", localPress: "صحافة",
    watchOn: "شاهد على", viewOn: "عرض على", readOn: "اقرأ على", viewSource: "عرض المصدر الأصلي", summarizeAI: "تلخيص بالذكاء", analyzing: "جاري التحليل...",
    aiSummary: "ملخص ذكي", impactHigh: "مرتفع", impactMedium: "متوسط", impactLow: "منخفض",
  },
  hi: {
    trends: "रुझान", moreTrends: "और रुझान", filters: "फ़िल्टर",
    country: "देश", period: "अवधि", category: "श्रेणी", type: "प्रकार",
    global: "वैश्विक", lastHour: "पिछला घंटा", today: "आज", thisWeek: "इस सप्ताह", thisMonth: "इस महीने",
    all: "सभी", politics: "राजनीति", entertainment: "मनोरंजन", technology: "तकनीक",
    sports: "खेल", culture: "संस्कृति", business: "व्यापार/वित्त", science: "विज्ञान",
    allMedia: "सभी मीडिया", socialMedia: "सोशल मीडिया", press: "प्रेस", searches: "खोज (Google)",
    live: "लाइव", peak: "शिखर", copied: "कॉपी किया!", updated: "अपडेट किया",
    about: "के बारे में", aboutTitle: "Global-Talk-Trending",
    aboutDesc: "रियल-टाइम ग्लोबल ट्रेंड मॉनिटर।",
    map: "मानचित्र", satellite: "उपग्रह", terrain: "भूभाग", timeline: "टाइमलाइन",
    clickToClose: "बंद करने के लिए क्लिक करें", trendCount: "रुझान", loading: "लोड हो रहा है...",
    expandDetails: "विवरण देखें", evolution24h: "24 घंटे का विकास", share: "शेयर", noTrends: "कोई रुझान नहीं",
    heatmapDensity: "रुझान घनत्व", low: "कम", high: "अधिक",
    views: "दृश्य", upvotes: "अपवोट", comments: "टिप्पणियाँ", interactions: "इंटरैक्शन", likes: "पसंद",
    officialSource: "आधिकारिक स्रोत", scientific: "अकादमिक/वैज्ञानिक", international: "अंतर्राष्ट्रीय", localPress: "प्रेस",
    watchOn: "पर देखें", viewOn: "पर देखें", readOn: "पर पढ़ें", viewSource: "मूल स्रोत देखें", summarizeAI: "AI से सारांश", analyzing: "विश्लेषण...",
    aiSummary: "AI सारांश", impactHigh: "उच्च", impactMedium: "मध्यम", impactLow: "कम",
  },
  ru: {
    trends: "Тренды", moreTrends: "Больше трендов", filters: "Фильтры",
    country: "Страна", period: "Период", category: "Категория", type: "Тип",
    global: "Глобально", lastHour: "Последний час", today: "Сегодня", thisWeek: "Эта неделя", thisMonth: "Этот месяц",
    all: "Все", politics: "Политика", entertainment: "Развлечения", technology: "Технологии",
    sports: "Спорт", culture: "Культура", business: "Бизнес/Финансы", science: "Наука",
    allMedia: "Все медиа", socialMedia: "Соцсети", press: "Пресса", searches: "Поиск (Google)",
    live: "в прямом эфире", peak: "ПИК", copied: "Скопировано!", updated: "Обновлено",
    about: "О проекте", aboutTitle: "Global-Talk-Trending",
    aboutDesc: "Монитор глобальных трендов в реальном времени. Мы агрегируем данные из YouTube, Reddit, Google Trends и NewsAPI.",
    map: "Карта", satellite: "Спутник", terrain: "Рельеф", timeline: "Таймлайн",
    clickToClose: "Нажмите, чтобы закрыть", trendCount: "тренды", loading: "Загрузка...",
    expandDetails: "Подробнее", evolution24h: "Динамика 24ч", share: "Поделиться", noTrends: "Нет трендов",
    heatmapDensity: "Плотность трендов", low: "Низкий", high: "Высокий",
    views: "просмотры", upvotes: "голоса", comments: "комментарии", interactions: "взаимодействия", likes: "лайки",
    officialSource: "Официальный источник", scientific: "Академический/Научный", international: "Международный", localPress: "Пресса",
    watchOn: "Смотреть на", viewOn: "Смотреть на", readOn: "Читать на", viewSource: "Оригинальный источник", summarizeAI: "Резюме с ИИ", analyzing: "Анализ...",
    aiSummary: "Резюме ИИ", impactHigh: "Высокий", impactMedium: "Средний", impactLow: "Низкий",
  },
};

interface LanguageContextType {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<LangCode>("pt");
  const t = useCallback((key: TranslationKey) => translations[lang]?.[key] || translations.pt[key] || key, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};
