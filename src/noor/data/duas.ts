export type DuaCategory =
  | 'Daily'
  | 'Ramadan'
  | 'Janazah'
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
  'Ramadan',
  'Janazah',
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
  // ---------- Ramadan ----------
  {
    id: 'new-moon',
    title: 'On seeing the new moon (Ramadan crescent)',
    category: 'Ramadan',
    arabic:
      'اللَّهُمَّ أَهْلِلْهُ عَلَيْنَا بِالْيُمْنِ وَالْإِيمَانِ وَالسَّلَامَةِ وَالْإِسْلَامِ، رَبِّي وَرَبُّكَ اللَّهُ',
    transliteration:
      "Allahumma ahlilhu 'alayna bil-yumni wal-iman, was-salamati wal-islam. Rabbi wa rabbuk-Allah",
    translation:
      'O Allah, bring this new moon over us with blessing and faith, with safety and Islam. My Lord and your Lord is Allah.',
    reference: 'At-Tirmidhi 3451',
  },
  {
    id: 'sehri-intention',
    title: 'Intention for fasting (Sehri)',
    category: 'Ramadan',
    arabic: 'وَبِصَوْمِ غَدٍ نَّوَيْتُ مِنْ شَهْرِ رَمَضَانَ',
    transliteration: 'Wa bi-sawmi ghadin nawaytu min shahri Ramadan',
    translation: "I intend to keep tomorrow's fast of the month of Ramadan.",
    reference:
      'Customary wording, not from a hadith; the intention itself is made in the heart',
  },
  {
    id: 'iftar',
    title: 'At the time of Iftar',
    category: 'Ramadan',
    arabic:
      'ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ',
    transliteration:
      "Dhahabaz-zama'u wabtallatil-'uruqu wa thabatal-ajru in sha' Allah",
    translation:
      'The thirst is gone, the veins are moistened, and the reward is confirmed, if Allah wills.',
    reference: 'Abu Dawud 2357 (hasan)',
  },
  {
    id: 'iftar-common',
    title: 'Iftar dua (commonly recited)',
    category: 'Ramadan',
    arabic: 'اللَّهُمَّ لَكَ صُمْتُ وَعَلَى رِزْقِكَ أَفْطَرْتُ',
    transliteration: "Allahumma laka sumtu wa 'ala rizqika aftartu",
    translation:
      'O Allah, for You I have fasted, and with Your provision I break my fast.',
    reference: 'Abu Dawud 2358 (mursal, a weak chain; widely recited)',
  },
  {
    id: 'laylatul-qadr',
    title: 'On Laylat al-Qadr',
    category: 'Ramadan',
    arabic: 'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي',
    transliteration: "Allahumma innaka 'afuwwun tuhibbul-'afwa fa'fu 'anni",
    translation:
      'O Allah, You are Most Forgiving and You love to forgive, so forgive me.',
    reference: 'At-Tirmidhi 3513, Ibn Majah 3850',
  },
  {
    id: 'fasting-provoked',
    title: 'When someone provokes you while fasting',
    category: 'Ramadan',
    arabic: 'إِنِّي صَائِمٌ',
    transliteration: "Inni sa'im",
    translation: 'I am fasting.',
    reference: 'Sahih al-Bukhari 1894, Sahih Muslim 1151',
  },
  {
    id: 'iftar-host',
    title: "Breaking the fast at someone's home",
    category: 'Ramadan',
    arabic:
      'أَفْطَرَ عِنْدَكُمُ الصَّائِمُونَ، وَأَكَلَ طَعَامَكُمُ الْأَبْرَارُ، وَصَلَّتْ عَلَيْكُمُ الْمَلَائِكَةُ',
    transliteration:
      "Aftara 'indakumus-sa'imun, wa akala ta'amakumul-abrar, wa sallat 'alaykumul-mala'ikah",
    translation:
      'May those who are fasting break their fast with you, may the righteous eat your food, and may the angels pray for you.',
    reference: 'Abu Dawud 3854',
  },
  // ---------- Janazah (funeral) ----------
  {
    id: 'hearing-death',
    title: 'On hearing of a death',
    category: 'Janazah',
    arabic:
      'إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ، اللَّهُمَّ أْجُرْنِي فِي مُصِيبَتِي وَأَخْلِفْ لِي خَيْرًا مِنْهَا',
    transliteration:
      "Inna lillahi wa inna ilayhi raji'un. Allahumma'jurni fi musibati wa akhlif li khayran minha",
    translation:
      'Indeed we belong to Allah, and indeed to Him we will return. O Allah, reward me for my loss and replace it for me with something better.',
    reference: 'Sahih Muslim 918; Quran, Al-Baqarah 2:156',
  },
  {
    id: 'janazah-durood',
    title: 'Janazah: after the 2nd takbir (Durood)',
    category: 'Janazah',
    arabic:
      'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ',
    transliteration:
      "Allahumma salli 'ala Muhammadin wa 'ala ali Muhammad, kama sallayta 'ala Ibrahima wa 'ala ali Ibrahim, innaka Hamidun Majid. Allahumma barik 'ala Muhammadin wa 'ala ali Muhammad, kama barakta 'ala Ibrahima wa 'ala ali Ibrahim, innaka Hamidun Majid",
    translation:
      'O Allah, send prayers upon Muhammad and the family of Muhammad, as You sent prayers upon Ibrahim and the family of Ibrahim; You are Praiseworthy, Glorious. O Allah, bless Muhammad and the family of Muhammad, as You blessed Ibrahim and the family of Ibrahim; You are Praiseworthy, Glorious.',
    reference: 'Sahih al-Bukhari 3370',
  },
  {
    id: 'janazah-adult',
    title: 'Janazah: after the 3rd takbir (adult)',
    category: 'Janazah',
    arabic:
      'اللَّهُمَّ اغْفِرْ لِحَيِّنَا وَمَيِّتِنَا، وَشَاهِدِنَا وَغَائِبِنَا، وَصَغِيرِنَا وَكَبِيرِنَا، وَذَكَرِنَا وَأُنْثَانَا، اللَّهُمَّ مَنْ أَحْيَيْتَهُ مِنَّا فَأَحْيِهِ عَلَى الْإِسْلَامِ، وَمَنْ تَوَفَّيْتَهُ مِنَّا فَتَوَفَّهُ عَلَى الْإِيمَانِ',
    transliteration:
      "Allahummaghfir li-hayyina wa mayyitina, wa shahidina wa gha'ibina, wa saghirina wa kabirina, wa dhakarina wa unthana. Allahumma man ahyaytahu minna fa-ahyihi 'alal-islam, wa man tawaffaytahu minna fa-tawaffahu 'alal-iman",
    translation:
      'O Allah, forgive our living and our dead, those present and those absent, our young and our old, our men and our women. O Allah, whoever of us You keep alive, keep alive upon Islam, and whoever of us You take, take upon faith.',
    reference: 'Abu Dawud 3201, At-Tirmidhi 1024, Ibn Majah 1498',
  },
  {
    id: 'janazah-long',
    title: 'Janazah: longer dua for the deceased',
    category: 'Janazah',
    arabic:
      'اللَّهُمَّ اغْفِرْ لَهُ وَارْحَمْهُ، وَعَافِهِ وَاعْفُ عَنْهُ، وَأَكْرِمْ نُزُلَهُ، وَوَسِّعْ مُدْخَلَهُ، وَاغْسِلْهُ بِالْمَاءِ وَالثَّلْجِ وَالْبَرَدِ، وَنَقِّهِ مِنَ الْخَطَايَا كَمَا نَقَّيْتَ الثَّوْبَ الْأَبْيَضَ مِنَ الدَّنَسِ، وَأَبْدِلْهُ دَارًا خَيْرًا مِنْ دَارِهِ، وَأَهْلًا خَيْرًا مِنْ أَهْلِهِ، وَزَوْجًا خَيْرًا مِنْ زَوْجِهِ، وَأَدْخِلْهُ الْجَنَّةَ، وَأَعِذْهُ مِنْ عَذَابِ الْقَبْرِ وَعَذَابِ النَّارِ',
    transliteration:
      "Allahummaghfir lahu warhamhu, wa 'afihi wa'fu 'anhu, wa akrim nuzulahu, wa wassi' mudkhalahu, waghsilhu bil-ma'i wath-thalji wal-barad, wa naqqihi minal-khataya kama naqqaytath-thawbal-abyada minad-danas, wa abdilhu daran khayran min darihi, wa ahlan khayran min ahlihi, wa zawjan khayran min zawjihi, wa adkhilhul-jannah, wa a'idhhu min 'adhabil-qabri wa 'adhabin-nar",
    translation:
      'O Allah, forgive him and have mercy on him, keep him safe and pardon him, honour his resting place and make his entry wide. Wash him with water, snow and hail, and cleanse him of sins as a white garment is cleansed of dirt. Give him a home better than his home, a family better than his family and a spouse better than his spouse. Admit him to Paradise and protect him from the punishment of the grave and the punishment of the Fire.',
    reference: 'Sahih Muslim 963 (for a woman, say -ha instead of -hu)',
  },
  {
    id: 'janazah-boy',
    title: 'Janazah: after the 3rd takbir (boy)',
    category: 'Janazah',
    arabic:
      'اللَّهُمَّ اجْعَلْهُ لَنَا فَرَطًا، وَاجْعَلْهُ لَنَا أَجْرًا وَذُخْرًا، وَاجْعَلْهُ لَنَا شَافِعًا وَمُشَفَّعًا',
    transliteration:
      "Allahummaj'alhu lana faratan, waj'alhu lana ajran wa dhukhran, waj'alhu lana shafi'an wa mushaffa'a",
    translation:
      'O Allah, make him go ahead of us to prepare for us, make him a reward and a treasure for us, and make him an intercessor for us whose intercession is accepted.',
    reference:
      "Hanafi practice, based on al-Hasan al-Basri's dua (Sahih al-Bukhari, Book of Funerals)",
  },
  {
    id: 'janazah-girl',
    title: 'Janazah: after the 3rd takbir (girl)',
    category: 'Janazah',
    arabic:
      'اللَّهُمَّ اجْعَلْهَا لَنَا فَرَطًا، وَاجْعَلْهَا لَنَا أَجْرًا وَذُخْرًا، وَاجْعَلْهَا لَنَا شَافِعَةً وَمُشَفَّعَةً',
    transliteration:
      "Allahummaj'alha lana faratan, waj'alha lana ajran wa dhukhran, waj'alha lana shafi'atan wa mushaffa'ah",
    translation:
      'O Allah, make her go ahead of us to prepare for us, make her a reward and a treasure for us, and make her an intercessor for us whose intercession is accepted.',
    reference:
      "Hanafi practice, based on al-Hasan al-Basri's dua (Sahih al-Bukhari, Book of Funerals)",
  },
  {
    id: 'burial',
    title: 'When placing the deceased in the grave',
    category: 'Janazah',
    arabic: 'بِسْمِ اللَّهِ وَعَلَى سُنَّةِ رَسُولِ اللَّهِ',
    transliteration: "Bismillahi wa 'ala sunnati Rasulillah",
    translation:
      'In the name of Allah, and according to the Sunnah of the Messenger of Allah.',
    reference: 'Abu Dawud 3213, At-Tirmidhi 1046',
  },
  {
    id: 'visiting-graves',
    title: 'When visiting the graves',
    category: 'Janazah',
    arabic:
      'السَّلَامُ عَلَيْكُمْ أَهْلَ الدِّيَارِ مِنَ الْمُؤْمِنِينَ وَالْمُسْلِمِينَ، وَإِنَّا إِنْ شَاءَ اللَّهُ بِكُمْ لَلَاحِقُونَ، نَسْأَلُ اللَّهَ لَنَا وَلَكُمُ الْعَافِيَةَ',
    transliteration:
      "As-salamu 'alaykum ahlad-diyari minal-mu'minina wal-muslimin, wa inna in sha' Allahu bikum la-lahiqun. Nas'alullaha lana wa lakumul-'afiyah",
    translation:
      'Peace be upon you, O people of these dwellings, the believers and the Muslims. We will, if Allah wills, join you. We ask Allah for well-being for us and for you.',
    reference: 'Sahih Muslim 975',
  },
];
