/** Konten halaman Panduan Filter. Sumber: docs/running-shoe-categories-guide.md & scripts/lib/classify-fit.ts */

export interface GuideSub {
  label: string;
  desc: string;
}
export interface GuideGroup {
  key: string;
  emoji: string;
  label: string;
  desc: string;
  subs: GuideSub[];
}

export const ROTATION_GUIDE: GuideGroup[] = [
  {
    key: "daily_trainer", emoji: "🟢", label: "Daily / Easy",
    desc: "Sepatu \"workhorse\" yang dipakai 60–80% dari total mileage mingguan. Nyaman, awet, tanpa pelat.",
    subs: [
      { label: "Daily / Easy Run", desc: "Lari santai dan base mileage di pace easy–moderate." },
      { label: "Long Run", desc: "Lari panjang 18 km+; lebih empuk dari daily untuk melawan lelah di akhir jarak." },
      { label: "Recovery Run", desc: "Sangat empuk, dipakai sehari setelah sesi berat agar otot tidak terbebani." },
    ],
  },
  {
    key: "super_shoes", emoji: "🏆", label: "Super Shoes",
    desc: "Pelat karbon + busa super (PEBA) + stack tinggi. Meningkatkan running economy ±4–6%, khusus race day.",
    subs: [
      { label: "Race Short ≤13 km", desc: "Untuk 5K–10K: pelat lebih kaku, lebih ringan, stack lebih rendah." },
      { label: "Race Long ≥21 km", desc: "Untuk half/full marathon: busa lebih lembut dan stack lebih tinggi (35–42 mm)." },
    ],
  },
  {
    key: "super_trainer", emoji: "⚡", label: "Super Trainer",
    desc: "Versi latihan dari super shoes: teknologi mirip, tapi outsole lebih tebal dan awet (600–800 km).",
    subs: [
      { label: "Speed work & long run berkualitas", desc: "Dipakai untuk simulasi rasa race tanpa menghabiskan sepatu race." },
    ],
  },
  {
    key: "speed_tempo", emoji: "⏱️", label: "Speed / Tempo",
    desc: "Ringan dan responsif untuk latihan kecepatan: interval, tempo, strides.",
    subs: [
      { label: "Interval & repetisi", desc: "Sesi cepat berulang dengan jeda; butuh respons dan bobot ringan." },
      { label: "Tempo", desc: "Lari ritme stabil mendekati ambang laktat." },
    ],
  },
  {
    key: "max_cushion", emoji: "🛡️", label: "Max Cushion",
    desc: "Stack tertinggi (≥35 mm) dan busa paling plush. Proteksi maksimal, konsekuensinya lebih berat.",
    subs: [
      { label: "High mileage", desc: "Untuk volume tinggi dan jarak jauh." },
      { label: "Recovery / pemulihan cedera", desc: "Mengurangi beban impact pada sendi." },
    ],
  },
  {
    key: "stability", emoji: "⚖️", label: "Stability",
    desc: "Dukungan biomekanik untuk pelari overpronasi (kaki roll ke dalam) lewat medial post atau guide rail.",
    subs: [
      { label: "Mild stability", desc: "Dukungan ringan; langkah hanya perlu sedikit dikoreksi." },
      { label: "Stability penuh", desc: "Kontrol gerak pergelangan lebih kuat untuk overpronasi jelas." },
    ],
  },
  {
    key: "trail_daily", emoji: "🌲", label: "Trail Daily",
    desc: "Workhorse trail untuk latihan harian di medan off-road: grip agresif dan proteksi bawah kaki.",
    subs: [
      { label: "Trail Speed / Tempo", desc: "Lebih ringan; untuk tempo, hill repeat, dan strides di trail." },
      { label: "Trail Long Run", desc: "Cushion lebih tinggi untuk lari panjang 18 km+ di trail." },
      { label: "Trail Recovery", desc: "Busa sangat empuk untuk pemulihan aktif di medan off-road." },
      { label: "Soft Ground (SG)", desc: "Lug dalam untuk lumpur dan tanah basah." },
      { label: "Firm Ground (FG)", desc: "Lug pendek untuk tanah keras dan kering." },
      { label: "Multi Ground (MG)", desc: "Kompromi SG dan FG; paling serbaguna." },
      { label: "Technical / Mountain", desc: "Proteksi dan stabilitas ekstra untuk batu, akar, tanjakan curam, dan alpine." },
      { label: "Desert / Dry", desc: "Lug tipis, upper sangat breathable untuk pasir dan hardpan." },
    ],
  },
  {
    key: "trail_race_long", emoji: "⛰️", label: "Trail Ultra",
    desc: "Trail jarak jauh (50K ke atas): cushion maksimal, toe box lega, outsole tahan satu event penuh.",
    subs: [
      { label: "Trail Race Short ≤21 km", desc: "Cepat dan ringan, ground feel tinggi untuk trail race pendek–menengah." },
      { label: "Trail Race Long ≥50 km", desc: "Perlindungan dan kenyamanan untuk 8–40+ jam." },
      { label: "Trail Super Shoes", desc: "Pelat karbon + busa PEBA + lug, performa gaya road super shoes di off-road." },
    ],
  },
];

export const FIT_GUIDE: GuideGroup[] = [
  {
    key: "fit",
    emoji: "👟",
    label: "Fit",
    desc: "Kecocokan sepatu dengan kaki. Panjang dari voting pembeli (min. 20 suara), lebar dari pengukuran lab. Dua sumbu itu digabung jadi tiga pilihan filter.",
    subs: [
      { label: "True to size", desc: "Panjang pas DAN lebar standar. Ukuran biasa Anda aman." },
      { label: "Sempit / Kecil", desc: "Lebar sempit atau ukuran jatuh kecil. Pertimbangkan varian wide atau naik ½–1 size." },
      { label: "Lebar / Besar", desc: "Ruang jari lega atau ukuran jatuh besar. Cocok untuk kaki lebar; bila longgar, turun ½–1 size." },
      { label: "Belum ada data", desc: "Suara pembeli kurang atau data lab belum ada." },
    ],
  },
];

export const BREATHABILITY_GUIDE: GuideGroup[] = [
  {
    key: "breathability", emoji: "🌬️", label: "Breathability",
    desc: "Seberapa adem atau panas sepatu saat dipakai lari, terutama dipengaruhi bahan upper. Dinilai dari label lab, lalu skor, lalu kata kunci bahan.",
    subs: [
      { label: "Adem", desc: "Upper terbuka/berventilasi (skor lab ≥ 4). Cocok untuk cuaca panas dan lembap." },
      { label: "Sedang", desc: "Sirkulasi udara cukup (skor 3). Aman untuk sebagian besar kondisi." },
      { label: "Panas", desc: "Upper rapat atau bermembran waterproof seperti Gore-Tex (skor ≤ 2). Hangat; cocok untuk hujan atau dingin." },
      { label: "Belum ada data", desc: "Data breathability belum tersedia." },
    ],
  },
];
