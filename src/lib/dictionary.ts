export interface Word {
  en: string
  bn: string
  said: string
  pos: string
}

export const DICTIONARY: Word[] = [
  { en: 'hello', bn: 'হ্যালো', said: 'halo', pos: 'greeting' },
  { en: 'goodbye', bn: 'বিদায়', said: 'biday', pos: 'interjection' },
  { en: 'thank you', bn: 'ধন্যবাদ', said: 'dhonnobad', pos: 'phrase' },
  { en: 'please', bn: 'অনুগ্রহ করে', said: 'onugroho kore', pos: 'adverb' },
  { en: 'how are you', bn: 'কেমন আছো', said: 'kemon acho', pos: 'phrase' },
  { en: 'I love you', bn: 'আমি তোমায় ভালোবাসি', said: 'ami tomay bhalobashi', pos: 'phrase' },
  { en: 'what is your name', bn: 'তোমার নাম কী', said: 'tomar nam ki', pos: 'phrase' },
  { en: 'water', bn: 'পানি', said: 'pani', pos: 'noun' },
  { en: 'book', bn: 'বই', said: 'boi', pos: 'noun' },
  { en: 'time', bn: 'সময়', said: 'shomoy', pos: 'noun' },
  { en: 'today', bn: 'আজ', said: 'aj', pos: 'adverb' },
  { en: 'tomorrow', bn: 'আগামীকাল', said: 'agamikal', pos: 'adverb' },
  { en: 'yesterday', bn: 'গতকাল', said: 'gotokal', pos: 'adverb' },
  { en: 'friend', bn: 'বন্ধু', said: 'bondhu', pos: 'noun' },
  { en: 'work', bn: 'কাজ', said: 'kaj', pos: 'noun' },
  { en: 'home', bn: 'বাড়ি', said: 'bari', pos: 'noun' },
  { en: 'food', bn: 'খাবার', said: 'khabar', pos: 'noun' },
  { en: 'love', bn: 'ভালোবাসা', said: 'bhalobasha', pos: 'noun' },
  { en: 'peace', bn: 'শান্তি', said: 'shanti', pos: 'noun' },
  { en: 'morning', bn: 'সকাল', said: 'shokal', pos: 'noun' },
  { en: 'night', bn: 'রাত', said: 'raat', pos: 'noun' },
  { en: 'yes', bn: 'হ্যাঁ', said: 'hya', pos: 'interjection' },
  { en: 'no', bn: 'না', said: 'na', pos: 'interjection' },
  { en: 'name', bn: 'নাম', said: 'nam', pos: 'noun' },
  { en: 'day', bn: 'দিন', said: 'din', pos: 'noun' },
  { en: 'week', bn: 'সপ্তাহ', said: 'shoptaho', pos: 'noun' },
  { en: 'month', bn: 'মাস', said: 'mash', pos: 'noun' },
  { en: 'year', bn: 'বছর', said: 'bochor', pos: 'noun' },
  { en: 'money', bn: 'টাকা', said: 'taka', pos: 'noun' },
  { en: 'price', bn: 'দাম', said: 'dam', pos: 'noun' },
  { en: 'buy', bn: 'কেনা', said: 'kena', pos: 'verb' },
  { en: 'read', bn: 'পড়া', said: 'pora', pos: 'verb' },
  { en: 'write', bn: 'লেখা', said: 'lekha', pos: 'verb' },
  { en: 'walk', bn: 'হাঁটা', said: 'hata', pos: 'verb' },
  { en: 'run', bn: 'দৌড়ানো', said: 'dourano', pos: 'verb' },
  { en: 'sleep', bn: 'ঘুম', said: 'ghum', pos: 'noun' },
  { en: 'eat', bn: 'খাওয়া', said: 'khawa', pos: 'verb' },
  { en: 'drink', bn: 'পান করা', said: 'pan kora', pos: 'verb' },
  { en: 'see', bn: 'দেখা', said: 'dekha', pos: 'verb' },
  { en: 'good', bn: 'ভালো', said: 'bhalo', pos: 'adjective' },
  { en: 'bad', bn: 'খারাপ', said: 'kharap', pos: 'adjective' },
  { en: 'beautiful', bn: 'সুন্দর', said: 'shundor', pos: 'adjective' },
  { en: 'big', bn: 'বড়', said: 'boro', pos: 'adjective' },
  { en: 'small', bn: 'ছোট', said: 'choto', pos: 'adjective' },
  { en: 'new', bn: 'নতুন', said: 'notun', pos: 'adjective' },
  { en: 'old', bn: 'পুরনো', said: 'purono', pos: 'adjective' },
  { en: 'happy', bn: 'খুশি', said: 'khushi', pos: 'adjective' },
  { en: 'family', bn: 'পরিবার', said: 'poribar', pos: 'noun' },
  { en: 'mother', bn: 'মা', said: 'ma', pos: 'noun' },
  { en: 'father', bn: 'বাবা', said: 'baba', pos: 'noun' },
  { en: 'city', bn: 'শহর', said: 'shohor', pos: 'noun' },
  { en: 'rain', bn: 'বৃষ্টি', said: 'brishti', pos: 'noun' },
  { en: 'sun', bn: 'সূর্য', said: 'surjo', pos: 'noun' },
  { en: 'prayer', bn: 'নামাজ', said: 'namaz', pos: 'noun' },
  { en: 'news', bn: 'সংবাদ', said: 'songbad', pos: 'noun' },
  { en: 'goal', bn: 'লক্ষ্য', said: 'lokkho', pos: 'noun' },
  { en: 'habit', bn: 'অভ্যাস', said: 'obbhyash', pos: 'noun' },
  { en: 'health', bn: 'স্বাস্থ্য', said: 'shastho', pos: 'noun' },
  { en: 'remember', bn: 'মনে রাখা', said: 'mone rakha', pos: 'verb' },
  { en: 'help', bn: 'সাহায্য', said: 'shahajjo', pos: 'noun' },
  { en: 'start', bn: 'শুরু', said: 'shuru', pos: 'noun' },
  { en: 'open', bn: 'খোলা', said: 'khola', pos: 'adjective' },
  { en: 'note', bn: 'নোট', said: 'note', pos: 'noun' },
  { en: 'today I am grateful', bn: 'আজ আমি কৃতজ্ঞ', said: 'aj ami kritoggo', pos: 'phrase' },
]

export function searchWords(query: string, direction: 'en-bn' | 'bn-en'): Word[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return DICTIONARY.slice(0, 5)
  const ranked = DICTIONARY.map((word) => {
    const en = word.en.toLowerCase()
    const bn = word.bn.toLowerCase()
    const primary = direction === 'en-bn' ? en : bn
    const secondary = direction === 'en-bn' ? bn : en
    let score = 0
    if (primary.startsWith(needle)) score += 4
    else if (primary.includes(needle)) score += 2
    if (secondary.includes(needle)) score += 1
    return { word, score }
  }).filter((entry) => entry.score > 0)
  ranked.sort((a, b) => b.score - a.score || a.word.en.localeCompare(b.word.en))
  return ranked.slice(0, 8).map((entry) => entry.word)
}
