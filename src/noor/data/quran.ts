/**
 * Offline sample of the Quran text bundled with the app.
 * Arabic text with English meaning (Saheeh International).
 * TODO: load the full mushaf (all 6,236 ayat) from a Quran API or a bundled JSON file.
 */
export type Ayah = { ar: string; en: string };

export const BISMILLAH = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';

export const QURAN_TEXT: Record<number, Ayah[]> = {
  1: [
    {
      ar: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
      en: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.',
    },
    {
      ar: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
      en: '[All] praise is [due] to Allah, Lord of the worlds –',
    },
    {
      ar: 'الرَّحْمَٰنِ الرَّحِيمِ',
      en: 'The Entirely Merciful, the Especially Merciful,',
    },
    {
      ar: 'مَالِكِ يَوْمِ الدِّينِ',
      en: 'Sovereign of the Day of Recompense.',
    },
    {
      ar: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
      en: 'It is You we worship and You we ask for help.',
    },
    {
      ar: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ',
      en: 'Guide us to the straight path –',
    },
    {
      ar: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ',
      en: 'The path of those upon whom You have bestowed favor, not of those who have evoked [Your] anger or of those who are astray.',
    },
  ],
  103: [
    { ar: 'وَالْعَصْرِ', en: 'By time,' },
    { ar: 'إِنَّ الْإِنسَانَ لَفِي خُسْرٍ', en: 'Indeed, mankind is in loss,' },
    {
      ar: 'إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ وَتَوَاصَوْا بِالْحَقِّ وَتَوَاصَوْا بِالصَّبْرِ',
      en: 'Except for those who have believed and done righteous deeds and advised each other to truth and advised each other to patience.',
    },
  ],
  104: [
    {
      ar: 'وَيْلٌ لِّكُلِّ هُمَزَةٍ لُّمَزَةٍ',
      en: 'Woe to every scorner and mocker',
    },
    {
      ar: 'الَّذِي جَمَعَ مَالًا وَعَدَّدَهُ',
      en: 'Who collects wealth and [continuously] counts it.',
    },
    {
      ar: 'يَحْسَبُ أَنَّ مَالَهُ أَخْلَدَهُ',
      en: 'He thinks that his wealth will make him immortal.',
    },
    {
      ar: 'كَلَّا ۖ لَيُنبَذَنَّ فِي الْحُطَمَةِ',
      en: 'No! He will surely be thrown into the Crusher.',
    },
    {
      ar: 'وَمَا أَدْرَاكَ مَا الْحُطَمَةُ',
      en: 'And what can make you know what is the Crusher?',
    },
    {
      ar: 'نَارُ اللَّهِ الْمُوقَدَةُ',
      en: 'It is the fire of Allah, [eternally] fueled,',
    },
    {
      ar: 'الَّتِي تَطَّلِعُ عَلَى الْأَفْئِدَةِ',
      en: 'Which mounts directed at the hearts.',
    },
    {
      ar: 'إِنَّهَا عَلَيْهِم مُّؤْصَدَةٌ',
      en: 'Indeed, Hellfire will be closed down upon them',
    },
    { ar: 'فِي عَمَدٍ مُّمَدَّدَةٍ', en: 'In extended columns.' },
  ],
  105: [
    {
      ar: 'أَلَمْ تَرَ كَيْفَ فَعَلَ رَبُّكَ بِأَصْحَابِ الْفِيلِ',
      en: 'Have you not considered, [O Muhammad], how your Lord dealt with the companions of the elephant?',
    },
    {
      ar: 'أَلَمْ يَجْعَلْ كَيْدَهُمْ فِي تَضْلِيلٍ',
      en: 'Did He not make their plan into misguidance?',
    },
    {
      ar: 'وَأَرْسَلَ عَلَيْهِمْ طَيْرًا أَبَابِيلَ',
      en: 'And He sent against them birds in flocks,',
    },
    {
      ar: 'تَرْمِيهِم بِحِجَارَةٍ مِّن سِجِّيلٍ',
      en: 'Striking them with stones of hard clay,',
    },
    {
      ar: 'فَجَعَلَهُمْ كَعَصْفٍ مَّأْكُولٍ',
      en: 'And He made them like eaten straw.',
    },
  ],
  106: [
    {
      ar: 'لِإِيلَافِ قُرَيْشٍ',
      en: 'For the accustomed security of the Quraysh –',
    },
    {
      ar: 'إِيلَافِهِمْ رِحْلَةَ الشِّتَاءِ وَالصَّيْفِ',
      en: 'Their accustomed security [in] the caravan of winter and summer –',
    },
    {
      ar: 'فَلْيَعْبُدُوا رَبَّ هَٰذَا الْبَيْتِ',
      en: 'Let them worship the Lord of this House,',
    },
    {
      ar: 'الَّذِي أَطْعَمَهُم مِّن جُوعٍ وَآمَنَهُم مِّنْ خَوْفٍ',
      en: 'Who has fed them, [saving them] from hunger and made them safe, [saving them] from fear.',
    },
  ],
  107: [
    {
      ar: 'أَرَأَيْتَ الَّذِي يُكَذِّبُ بِالدِّينِ',
      en: 'Have you seen the one who denies the Recompense?',
    },
    {
      ar: 'فَذَٰلِكَ الَّذِي يَدُعُّ الْيَتِيمَ',
      en: 'For that is the one who drives away the orphan',
    },
    {
      ar: 'وَلَا يَحُضُّ عَلَىٰ طَعَامِ الْمِسْكِينِ',
      en: 'And does not encourage the feeding of the poor.',
    },
    { ar: 'فَوَيْلٌ لِّلْمُصَلِّينَ', en: 'So woe to those who pray' },
    {
      ar: 'الَّذِينَ هُمْ عَن صَلَاتِهِمْ سَاهُونَ',
      en: '[But] who are heedless of their prayer –',
    },
    {
      ar: 'الَّذِينَ هُمْ يُرَاءُونَ',
      en: 'Those who make show [of their deeds]',
    },
    {
      ar: 'وَيَمْنَعُونَ الْمَاعُونَ',
      en: 'And withhold [simple] assistance.',
    },
  ],
  108: [
    {
      ar: 'إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ',
      en: 'Indeed, We have granted you, [O Muhammad], al-Kawthar.',
    },
    {
      ar: 'فَصَلِّ لِرَبِّكَ وَانْحَرْ',
      en: 'So pray to your Lord and sacrifice [to Him alone].',
    },
    {
      ar: 'إِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ',
      en: 'Indeed, your enemy is the one cut off.',
    },
  ],
  109: [
    { ar: 'قُلْ يَا أَيُّهَا الْكَافِرُونَ', en: 'Say, "O disbelievers,' },
    {
      ar: 'لَا أَعْبُدُ مَا تَعْبُدُونَ',
      en: 'I do not worship what you worship.',
    },
    {
      ar: 'وَلَا أَنتُمْ عَابِدُونَ مَا أَعْبُدُ',
      en: 'Nor are you worshippers of what I worship.',
    },
    {
      ar: 'وَلَا أَنَا عَابِدٌ مَّا عَبَدتُّمْ',
      en: 'Nor will I be a worshipper of what you worship.',
    },
    {
      ar: 'وَلَا أَنتُمْ عَابِدُونَ مَا أَعْبُدُ',
      en: 'Nor will you be worshippers of what I worship.',
    },
    {
      ar: 'لَكُمْ دِينُكُمْ وَلِيَ دِينِ',
      en: 'For you is your religion, and for me is my religion."',
    },
  ],
  110: [
    {
      ar: 'إِذَا جَاءَ نَصْرُ اللَّهِ وَالْفَتْحُ',
      en: 'When the victory of Allah has come and the conquest,',
    },
    {
      ar: 'وَرَأَيْتَ النَّاسَ يَدْخُلُونَ فِي دِينِ اللَّهِ أَفْوَاجًا',
      en: 'And you see the people entering into the religion of Allah in multitudes,',
    },
    {
      ar: 'فَسَبِّحْ بِحَمْدِ رَبِّكَ وَاسْتَغْفِرْهُ ۚ إِنَّهُ كَانَ تَوَّابًا',
      en: 'Then exalt [Him] with praise of your Lord and ask forgiveness of Him. Indeed, He is ever Accepting of repentance.',
    },
  ],
  111: [
    {
      ar: 'تَبَّتْ يَدَا أَبِي لَهَبٍ وَتَبَّ',
      en: 'May the hands of Abu Lahab be ruined, and ruined is he.',
    },
    {
      ar: 'مَا أَغْنَىٰ عَنْهُ مَالُهُ وَمَا كَسَبَ',
      en: 'His wealth will not avail him or that which he gained.',
    },
    {
      ar: 'سَيَصْلَىٰ نَارًا ذَاتَ لَهَبٍ',
      en: 'He will [enter to] burn in a Fire of [blazing] flame',
    },
    {
      ar: 'وَامْرَأَتُهُ حَمَّالَةَ الْحَطَبِ',
      en: 'And his wife [as well] – the carrier of firewood.',
    },
    {
      ar: 'فِي جِيدِهَا حَبْلٌ مِّن مَّسَدٍ',
      en: 'Around her neck is a rope of [twisted] fiber.',
    },
  ],
  112: [
    { ar: 'قُلْ هُوَ اللَّهُ أَحَدٌ', en: 'Say, "He is Allah, [who is] One,' },
    { ar: 'اللَّهُ الصَّمَدُ', en: 'Allah, the Eternal Refuge.' },
    { ar: 'لَمْ يَلِدْ وَلَمْ يُولَدْ', en: 'He neither begets nor is born,' },
    {
      ar: 'وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ',
      en: 'Nor is there to Him any equivalent."',
    },
  ],
  113: [
    {
      ar: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ',
      en: 'Say, "I seek refuge in the Lord of daybreak',
    },
    {
      ar: 'مِن شَرِّ مَا خَلَقَ',
      en: 'From the evil of that which He created',
    },
    {
      ar: 'وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ',
      en: 'And from the evil of darkness when it settles',
    },
    {
      ar: 'وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ',
      en: 'And from the evil of the blowers in knots',
    },
    {
      ar: 'وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ',
      en: 'And from the evil of an envier when he envies."',
    },
  ],
  114: [
    {
      ar: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ',
      en: 'Say, "I seek refuge in the Lord of mankind,',
    },
    { ar: 'مَلِكِ النَّاسِ', en: 'The Sovereign of mankind,' },
    { ar: 'إِلَٰهِ النَّاسِ', en: 'The God of mankind,' },
    {
      ar: 'مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ',
      en: 'From the evil of the retreating whisperer –',
    },
    {
      ar: 'الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ',
      en: 'Who whispers [evil] into the breasts of mankind –',
    },
    {
      ar: 'مِنَ الْجِنَّةِ وَالنَّاسِ',
      en: 'From among the jinn and mankind."',
    },
  ],
};

export const AVAILABLE_SURAHS = Object.keys(QURAN_TEXT).map(Number);

export function hasText(surah: number) {
  return surah in QURAN_TEXT;
}

/** Hand-picked ayat rotated daily on the Home screen. */
export const DAILY_VERSES: { ar: string; en: string; ref: string }[] = [
  {
    ar: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ',
    en: 'Allah – there is no deity except Him, the Ever-Living, the Sustainer of [all] existence. Neither drowsiness overtakes Him nor sleep.',
    ref: 'Al-Baqarah 2:255 (part)',
  },
  {
    ar: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا',
    en: 'For indeed, with hardship [will be] ease. Indeed, with hardship [will be] ease.',
    ref: 'Ash-Sharh 94:5–6',
  },
  {
    ar: 'لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا',
    en: 'Allah does not charge a soul except [with that within] its capacity.',
    ref: 'Al-Baqarah 2:286 (part)',
  },
  {
    ar: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',
    en: 'Unquestionably, by the remembrance of Allah hearts are assured.',
    ref: "Ar-Ra'd 13:28 (part)",
  },
  {
    ar: 'فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ',
    en: 'So remember Me; I will remember you. And be grateful to Me and do not deny Me.',
    ref: 'Al-Baqarah 2:152',
  },
  {
    ar: 'لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ',
    en: 'Do not despair of the mercy of Allah.',
    ref: 'Az-Zumar 39:53 (part)',
  },
  {
    ar: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ',
    en: 'Indeed, Allah is with the patient.',
    ref: 'Al-Baqarah 2:153 (part)',
  },
  {
    ar: 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ',
    en: 'And whoever relies upon Allah – then He is sufficient for him.',
    ref: 'At-Talaq 65:3 (part)',
  },
  {
    ar: 'وَقُل رَّبِّ زِدْنِي عِلْمًا',
    en: 'And say, "My Lord, increase me in knowledge."',
    ref: 'Taha 20:114 (part)',
  },
  {
    ar: 'وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ',
    en: 'And when My servants ask you, [O Muhammad], concerning Me – indeed I am near.',
    ref: 'Al-Baqarah 2:186 (part)',
  },
];
