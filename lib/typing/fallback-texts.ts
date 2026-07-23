import type { Difficulty } from "@/types/app";

export interface TypingTextPayload {
  id: string;
  title: string;
  content: string;
  difficulty: Difficulty;
  categoryName: string;
}

export const fallbackTexts: TypingTextPayload[] = [
  {
    id: "offline-general",
    title: "Ritme Pagi",
    content:
      "Pagi yang tenang memberi ruang untuk memulai dengan rapi. Letakkan jari di baris utama, tarik napas, lalu ketik setiap kata tanpa terburu-buru.",
    difficulty: "easy",
    categoryName: "Umum",
  },
  {
    id: "offline-technology",
    title: "Jalur Data",
    content:
      "Sebuah sistem yang stabil memeriksa setiap permintaan, menjaga urutan data, dan memberi pesan yang jelas ketika koneksi terputus atau proses perlu diulang.",
    difficulty: "medium",
    categoryName: "Teknologi",
  },
  {
    id: "offline-science",
    title: "Catatan Observasi",
    content:
      "Pada pukul 07.15, suhu tercatat 26,4 °C; angin bergerak pelan dari timur. Pengukuran diulang 3 kali agar kesimpulannya tidak bertumpu pada satu angka.",
    difficulty: "hard",
    categoryName: "Sains",
  },
];
