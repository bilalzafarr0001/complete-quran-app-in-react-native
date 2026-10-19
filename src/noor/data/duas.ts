export type DuaCategory =
  | 'Daily'
  | 'Morning & Evening'
  | 'Food'
  | 'Sleep'
  | 'Travel'
  | 'Mosque'
  | 'Quranic';

export type Dua = {
  id: string;
  title: string;
  category: DuaCategory;
  arabic: string;
  transliteration: string;
  translation: string;
  reference: string;
};

export const DUA_CATEGORIES: DuaCategory[] = [
  'Daily',
  'Morning & Evening',
  'Food',
  'Sleep',
  'Travel',
  'Mosque',
  'Quranic',
];

export const DUAS: Dua[] = [
  {
    id: 'morning',
    title: 'Upon entering the morning',
    category: 'Morning & Evening',
    arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ',
    transliteration: 'Asbahna wa asbahal-mulku lillah, wal-hamdu lillah',
    translation:
      'We have entered the morning and the whole dominion belongs to Allah, and all praise is for Allah.',
    reference: 'Sahih Muslim (opening of the supplication)',
  },
  {
    id: 'evening',
    title: 'Upon entering the evening',
    category: 'Morning & Evening',
    arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ',
    transliteration: 'Amsayna wa amsal-mulku lillah, wal-hamdu lillah',
    translation:
      'We have entered the evening and the whole dominion belongs to Allah, and all praise is for Allah.',
    reference: 'Sahih Muslim (opening of the supplication)',
  },
  {
    id: 'before-eating',
    title: 'Before eating',
    category: 'Food',
    arabic: 'بِسْمِ اللَّهِ',
    transliteration: 'Bismillah',
    translation: 'In the name of Allah.',
    reference: 'Abu Dawud, At-Tirmidhi',
  },
  {
    id: 'after-eating',
    title: 'After eating',
    category: 'Food',
    arabic:
      'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَٰذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ',
    transliteration:
      "Al-hamdu lillahil-ladhi at'amani hadha wa razaqanihi min ghayri hawlin minni wa la quwwah",
    translation:
      'All praise is for Allah who fed me this and provided it for me without any might or power on my part.',
    reference: 'Abu Dawud, At-Tirmidhi, Ibn Majah',
  },
  {
    id: 'before-sleep',
    title: 'Before sleeping',
    category: 'Sleep',
    arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    transliteration: 'Bismika Allahumma amutu wa ahya',
    translation: 'In Your name, O Allah, I die and I live.',
    reference: 'Sahih al-Bukhari',
  },
  {
    id: 'waking',
    title: 'Upon waking up',
    category: 'Sleep',
    arabic:
      'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
    transliteration:
      "Al-hamdu lillahil-ladhi ahyana ba'da ma amatana wa ilayhin-nushur",
    translation:
      'All praise is for Allah who gave us life after having taken it from us, and unto Him is the resurrection.',
    reference: 'Sahih al-Bukhari',
  },
  {
    id: 'leaving-home',
    title: 'Leaving the home',
    category: 'Daily',
    arabic:
      'بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    transliteration:
      "Bismillahi tawakkaltu 'alallah, wa la hawla wa la quwwata illa billah",
    translation:
      'In the name of Allah, I place my trust in Allah, and there is no might nor power except with Allah.',
    reference: 'Abu Dawud, At-Tirmidhi',
  },
  {
    id: 'anxiety',
    title: 'In times of difficulty',
    category: 'Daily',
    arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ',
    transliteration: "Hasbunallahu wa ni'mal-wakeel",
    translation:
      'Sufficient for us is Allah, and [He is] the best Disposer of affairs.',
    reference: "Quran, Ali 'Imran 3:173",
  },
  {
    id: 'enter-mosque',
    title: 'Entering the mosque',
    category: 'Mosque',
    arabic: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
    transliteration: 'Allahummaf-tah li abwaba rahmatik',
    translation: 'O Allah, open for me the gates of Your mercy.',
    reference: 'Sahih Muslim',
  },
  {
    id: 'leave-mosque',
    title: 'Leaving the mosque',
    category: 'Mosque',
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ',
    transliteration: "Allahumma inni as'aluka min fadlik",
    translation: 'O Allah, I ask You of Your bounty.',
    reference: 'Sahih Muslim',
  },
  {
    id: 'travel',
    title: 'When setting off on a journey',
    category: 'Travel',
    arabic:
      'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَٰذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَىٰ رَبِّنَا لَمُنقَلِبُونَ',
    transliteration:
      'Subhanal-ladhi sakhkhara lana hadha wa ma kunna lahu muqrineen, wa inna ila rabbina lamunqaliboon',
    translation:
      'Glory be to Him who has subjected this to us, and we could not have [otherwise] subdued it. And indeed we, to our Lord, will surely return.',
    reference: 'Quran, Az-Zukhruf 43:13–14',
  },
  {
    id: 'rabbana-atina',
    title: 'For good in both worlds',
    category: 'Quranic',
    arabic:
      'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
    transliteration:
      "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina 'adhaban-nar",
    translation:
      'Our Lord, give us in this world [that which is] good and in the Hereafter [that which is] good and protect us from the punishment of the Fire.',
    reference: 'Quran, Al-Baqarah 2:201',
  },
  {
    id: 'knowledge',
    title: 'For increase in knowledge',
    category: 'Quranic',
    arabic: 'رَبِّ زِدْنِي عِلْمًا',
    transliteration: "Rabbi zidni 'ilma",
    translation: 'My Lord, increase me in knowledge.',
    reference: 'Quran, Taha 20:114',
  },
  {
    id: 'parents',
    title: 'For parents',
    category: 'Quranic',
    arabic: 'رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا',
    transliteration: 'Rabbir-hamhuma kama rabbayani sagheera',
    translation:
      'My Lord, have mercy upon them as they brought me up [when I was] small.',
    reference: 'Quran, Al-Isra 17:24',
  },
  {
    id: 'forgiveness',
    title: 'Seeking forgiveness',
    category: 'Quranic',
    arabic:
      'رَبَّنَا ظَلَمْنَا أَنفُسَنَا وَإِن لَّمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ',
    transliteration:
      'Rabbana zalamna anfusana wa in lam taghfir lana wa tarhamna lanakoonanna minal-khasireen',
    translation:
      'Our Lord, we have wronged ourselves, and if You do not forgive us and have mercy upon us, we will surely be among the losers.',
    reference: "Quran, Al-A'raf 7:23",
  },
];
