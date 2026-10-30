export type Dhikr = {
  id: string;
  arabic: string;
  transliteration: string;
  meaning: string;
};

export const DHIKR: Dhikr[] = [
  {
    id: 'subhanallah',
    arabic: 'سُبْحَانَ اللَّهِ',
    transliteration: 'SubhanAllah',
    meaning: 'Glory be to Allah',
  },
  {
    id: 'alhamdulillah',
    arabic: 'الْحَمْدُ لِلَّهِ',
    transliteration: 'Alhamdulillah',
    meaning: 'All praise is for Allah',
  },
  {
    id: 'allahuakbar',
    arabic: 'اللَّهُ أَكْبَرُ',
    transliteration: 'Allahu Akbar',
    meaning: 'Allah is the Greatest',
  },
  {
    id: 'lailaha',
    arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ',
    transliteration: 'La ilaha illallah',
    meaning: 'There is no god but Allah',
  },
  {
    id: 'astaghfirullah',
    arabic: 'أَسْتَغْفِرُ اللَّهَ',
    transliteration: 'Astaghfirullah',
    meaning: 'I seek forgiveness from Allah',
  },
  {
    id: 'subhanallahi-wabihamdihi',
    arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
    transliteration: 'SubhanAllahi wa bihamdihi',
    meaning: 'Glory be to Allah and all praise is His',
  },
  {
    id: 'durood',
    arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ',
    transliteration: "Allahumma salli 'ala Muhammad",
    meaning: 'O Allah, send blessings upon Muhammad ﷺ',
  },
];

export const TASBEEH_TARGETS = [33, 99, 100];
