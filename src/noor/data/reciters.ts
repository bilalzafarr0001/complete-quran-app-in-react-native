/** Reciters available from the Islamic Network audio CDN (one MP3 per ayah). */
export type Reciter = {
  id: string;
  name: string;
  arabic: string;
  style: string;
  bitrate: 64 | 128;
};

export const RECITERS: Reciter[] = [
  {
    id: 'ar.alafasy',
    name: 'Mishary Rashid Alafasy',
    arabic: 'مشاري راشد العفاسي',
    style: 'Murattal',
    bitrate: 128,
  },
  {
    id: 'ar.husary',
    name: 'Mahmoud Khalil Al-Husary',
    arabic: 'محمود خليل الحصري',
    style: 'Murattal',
    bitrate: 128,
  },
  {
    id: 'ar.minshawi',
    name: 'Mohamed Siddiq Al-Minshawi',
    arabic: 'محمد صديق المنشاوي',
    style: 'Murattal',
    bitrate: 128,
  },
  {
    id: 'ar.abdulbasitmurattal',
    name: 'Abdul Basit Abdus Samad',
    arabic: 'عبد الباسط عبد الصمد',
    style: 'Murattal',
    bitrate: 64,
  },
  {
    id: 'ar.abdurrahmaansudais',
    name: 'Abdul Rahman Al-Sudais',
    arabic: 'عبد الرحمن السديس',
    style: 'Murattal',
    bitrate: 64,
  },
];

export function getReciter(id: string): Reciter {
  return RECITERS.find(r => r.id === id) ?? RECITERS[0];
}
