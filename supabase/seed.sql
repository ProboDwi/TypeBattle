begin;

insert into public.text_categories (name, slug, description) values
  ('Umum', 'umum', 'Teks ringan dengan kosakata sehari-hari.'),
  ('Teknologi', 'teknologi', 'Perangkat, internet, dan kebiasaan digital.'),
  ('Pendidikan', 'pendidikan', 'Belajar, membaca, dan kehidupan sekolah.'),
  ('Cerita', 'cerita', 'Narasi pendek original dengan alur yang jelas.'),
  ('Sains', 'sains', 'Fenomena alam dan cara kerja dunia.'),
  ('Kehidupan sehari-hari', 'kehidupan-sehari-hari', 'Rutinitas rumah, perjalanan, dan lingkungan sekitar.')
on conflict (slug) do update set name = excluded.name, description = excluded.description;

insert into public.typing_texts (category_id, title, content, difficulty, status, source_label)
values
((select id from public.text_categories where slug = 'umum'), 'Pagi yang Tenang', 'Pagi ini udara terasa sejuk. Dita membuka jendela, merapikan meja, lalu menulis daftar kecil tentang hal yang ingin ia selesaikan sebelum siang.', 'easy', 'published', 'Original Keylane'),
((select id from public.text_categories where slug = 'umum'), 'Taman Kota', 'Di taman kota, beberapa orang berjalan santai di bawah pohon. Anak-anak bermain bola, sementara penjual minuman menata botol di atas meja kayu.', 'easy', 'published', 'Original Keylane'),
((select id from public.text_categories where slug = 'umum'), 'Rencana Akhir Pekan', 'Akhir pekan tidak harus penuh acara. Satu buku, secangkir teh, dan waktu tanpa terburu-buru bisa membuat tubuh serta pikiran terasa lebih ringan.', 'easy', 'published', 'Original Keylane'),
((select id from public.text_categories where slug = 'umum'), 'Kebiasaan Kecil', 'Kemajuan sering datang dari kebiasaan kecil yang dilakukan berulang. Lima belas menit latihan setiap hari terasa sederhana, tetapi hasilnya akan terlihat setelah beberapa minggu.', 'medium', 'published', 'Original Keylane'),
((select id from public.text_categories where slug = 'umum'), 'Catatan Perjalanan', 'Kereta berangkat pukul 06.45, tepat ketika matahari muncul di balik gedung. Saya mencatat tiga tujuan: pasar lama, museum kota, dan warung mi di ujung jalan.', 'hard', 'published', 'Original Keylane'),

((select id from public.text_categories where slug = 'teknologi'), 'Pembaruan Perangkat', 'Sebelum memasang pembaruan, simpan pekerjaan dan isi daya perangkat. Langkah sederhana ini membantu mencegah kehilangan data saat proses berlangsung.', 'easy', 'published', 'Original Keylane'),
((select id from public.text_categories where slug = 'teknologi'), 'Kata Sandi yang Baik', 'Kata sandi yang panjang lebih sulit ditebak. Gunakan kombinasi unik untuk setiap layanan dan simpan dengan pengelola kata sandi yang tepercaya.', 'easy', 'published', 'Original Keylane'),
((select id from public.text_categories where slug = 'teknologi'), 'Jaringan Rumah', 'Koneksi nirkabel dapat melambat karena dinding tebal, jarak, atau gangguan perangkat lain. Menempatkan router di area terbuka sering memberi hasil yang lebih stabil.', 'medium', 'published', 'Original Keylane'),
((select id from public.text_categories where slug = 'teknologi'), 'Antarmuka yang Bertanggung Jawab', 'Antarmuka yang baik bukan sekadar cantik; ia memberi petunjuk yang jelas, menjaga fokus, dan menjelaskan akibat sebelum pengguna melakukan tindakan penting.', 'medium', 'published', 'Original Keylane'),
((select id from public.text_categories where slug = 'teknologi'), 'Latensi dalam Sistem Realtime', 'Dalam sistem realtime, latensi 180 ms mungkin masih terasa mulus, tetapi urutan paket tetap harus diperiksa. Nomor sequence, timestamp server, dan mekanisme idempotensi mencegah status lama menimpa data baru.', 'hard', 'published', 'Original Keylane'),

((select id from public.text_categories where slug = 'pendidikan'), 'Membaca Perlahan', 'Membaca perlahan membantu kita menangkap gagasan utama. Setelah satu bagian selesai, berhenti sebentar dan rangkum isinya dengan kata-kata sendiri.', 'easy', 'published', 'Original Keylane'),
((select id from public.text_categories where slug = 'pendidikan'), 'Belajar Bersama', 'Kelompok belajar akan efektif jika setiap anggota membawa pertanyaan. Diskusi menjadi lebih terarah, dan semua orang mendapat ruang untuk menjelaskan pemahamannya.', 'medium', 'published', 'Original Keylane'),
((select id from public.text_categories where slug = 'pendidikan'), 'Umpan Balik', 'Umpan balik yang berguna membahas pekerjaan, bukan menyerang orangnya. Ia menyebut bagian yang sudah kuat, menunjukkan masalah secara spesifik, lalu menawarkan langkah perbaikan.', 'medium', 'published', 'Original Keylane'),
((select id from public.text_categories where slug = 'pendidikan'), 'Eksperimen Belajar', 'Cobalah pola 25-5: belajar fokus selama 25 menit, lalu istirahat 5 menit. Setelah empat putaran, ambil jeda lebih panjang dan periksa apakah metode tersebut benar-benar membantu.', 'hard', 'published', 'Original Keylane'),
((select id from public.text_categories where slug = 'pendidikan'), 'Menilai Sumber', 'Sebelum mengutip sebuah artikel, periksa penulis, tanggal terbit, metode, dan rujukannya. Informasi yang terdengar meyakinkan belum tentu akurat; bukti harus dapat ditelusuri dan dibandingkan.', 'hard', 'published', 'Original Keylane'),

((select id from public.text_categories where slug = 'cerita'), 'Lampu di Beranda', 'Lampu beranda masih menyala ketika Nara tiba. Di dekat pintu ada kotak kecil berisi roti hangat dan secarik pesan dari tetangga baru.', 'easy', 'published', 'Original Keylane'),
((select id from public.text_categories where slug = 'cerita'), 'Payung Merah', 'Hujan turun sebelum bus datang. Seorang anak mengangkat payung merahnya sedikit lebih tinggi agar nenek di sebelahnya ikut terlindung.', 'easy', 'published', 'Original Keylane'),
((select id from public.text_categories where slug = 'cerita'), 'Radio Tua', 'Arman menemukan radio tua di gudang dan membersihkan debunya. Saat tombol diputar, terdengar siaran samar yang menyebut nama jalan tempat ia berdiri.', 'medium', 'published', 'Original Keylane'),
((select id from public.text_categories where slug = 'cerita'), 'Kios Nomor Tujuh', 'Setiap Selasa, kios nomor tujuh menjual bunga tanpa label harga. Pembeli cukup meninggalkan cerita singkat; pemilik kios lalu memilih bunga yang menurutnya paling cocok.', 'medium', 'published', 'Original Keylane'),
((select id from public.text_categories where slug = 'cerita'), 'Pesan dari Peron 3', 'Papan keberangkatan menampilkan 21.10, tetapi kereta terakhir tak kunjung tiba. Tepat pukul 21.17, pengeras suara berderak: “Penumpang tujuan utara, jangan naik gerbong ke-4.”', 'hard', 'published', 'Original Keylane'),

((select id from public.text_categories where slug = 'sains'), 'Bayangan Siang', 'Bayangan tampak pendek saat matahari berada tinggi di langit. Menjelang sore, sudut cahaya berubah dan bayangan memanjang di permukaan tanah.', 'easy', 'published', 'Original Keylane'),
((select id from public.text_categories where slug = 'sains'), 'Siklus Air', 'Air menguap karena panas, membentuk awan, lalu kembali sebagai hujan. Sebagian meresap ke tanah, sedangkan sisanya mengalir menuju sungai dan laut.', 'easy', 'published', 'Original Keylane'),
((select id from public.text_categories where slug = 'sains'), 'Tanah yang Hidup', 'Segenggam tanah sehat menyimpan akar halus, mineral, udara, air, dan organisme kecil. Jaringan ini membantu tumbuhan memperoleh nutrisi serta menjaga struktur tanah.', 'medium', 'published', 'Original Keylane'),
((select id from public.text_categories where slug = 'sains'), 'Cahaya Bintang', 'Cahaya membutuhkan waktu untuk menempuh ruang. Ketika memandang bintang yang jauh, kita sebenarnya melihat keadaan masa lalunya, bukan kondisinya pada detik ini.', 'medium', 'published', 'Original Keylane'),
((select id from public.text_categories where slug = 'sains'), 'Pengukuran dan Ketidakpastian', 'Hasil 12,40 cm tidak selalu berarti benda itu tepat sepanjang 12,40 cm. Ketelitian alat, cara membaca skala, suhu, dan pengulangan eksperimen ikut menentukan rentang ketidakpastian.', 'hard', 'published', 'Original Keylane'),

((select id from public.text_categories where slug = 'kehidupan-sehari-hari'), 'Menyiapkan Sarapan', 'Raka mencuci buah, memanggang roti, dan menyiapkan air minum. Sarapan sederhana itu cukup untuk memulai hari tanpa merasa terburu-buru.', 'easy', 'published', 'Original Keylane'),
((select id from public.text_categories where slug = 'kehidupan-sehari-hari'), 'Belanja dengan Daftar', 'Daftar belanja membuat perjalanan ke pasar lebih singkat. Kelompokkan kebutuhan berdasarkan bagian toko agar tidak perlu bolak-balik mencari barang.', 'easy', 'published', 'Original Keylane'),
((select id from public.text_categories where slug = 'kehidupan-sehari-hari'), 'Meja Kerja', 'Sebelum mulai bekerja, singkirkan barang yang tidak dibutuhkan dan siapkan segelas air. Ruang yang teratur mengurangi gangguan kecil yang mudah memecah perhatian.', 'medium', 'published', 'Original Keylane'),
((select id from public.text_categories where slug = 'kehidupan-sehari-hari'), 'Rapat Lingkungan', 'Rapat warga dimulai pukul 19.30 dengan tiga agenda: jadwal kerja bakti, perbaikan lampu gang, dan pembagian nomor darurat. Semua keputusan dicatat agar dapat diperiksa kembali.', 'hard', 'published', 'Original Keylane'),
((select id from public.text_categories where slug = 'kehidupan-sehari-hari'), 'Mengatur Pengeluaran', 'Catat pengeluaran tetap, kebutuhan harian, dan dana cadangan secara terpisah. Jika pemasukan bulan ini Rp4.800.000, tentukan batas yang realistis sebelum membelanjakan sisanya.', 'hard', 'published', 'Original Keylane')
on conflict do nothing;

insert into public.achievements (code, name, description, icon_name, requirement_type, requirement_value, experience_reward) values
  ('first-practice', 'Latihan Pertama', 'Selesaikan satu sesi latihan resmi.', 'Keyboard', 'practices', 1, 20),
  ('five-practices', 'Lima Latihan', 'Selesaikan lima sesi latihan resmi.', 'ListChecks', 'practices', 5, 40),
  ('ten-races', 'Sepuluh Balapan', 'Selesaikan sepuluh balapan.', 'Flag', 'races', 10, 60),
  ('first-win', 'Kemenangan Pertama', 'Menangkan satu balapan.', 'Trophy', 'wins', 1, 40),
  ('wpm-50', 'Tembus 50 WPM', 'Raih kecepatan setidaknya 50 WPM.', 'Gauge', 'best_wpm', 50, 30),
  ('wpm-75', 'Tembus 75 WPM', 'Raih kecepatan setidaknya 75 WPM.', 'Gauge', 'best_wpm', 75, 50),
  ('wpm-100', 'Tembus 100 WPM', 'Raih kecepatan setidaknya 100 WPM.', 'Gauge', 'best_wpm', 100, 100),
  ('perfect-accuracy', 'Akurasi 100%', 'Selesaikan latihan tanpa satu kesalahan pun.', 'Crosshair', 'perfect_accuracy', 1, 50),
  ('streak-seven', 'Streak Tujuh Hari', 'Berlatih selama tujuh hari berturut-turut.', 'CalendarCheck', 'streak', 7, 75),
  ('five-wins', 'Menang Lima Kali', 'Menangkan lima balapan resmi.', 'Medal', 'wins', 5, 100)
on conflict (code) do update set name = excluded.name, description = excluded.description,
  icon_name = excluded.icon_name, requirement_type = excluded.requirement_type,
  requirement_value = excluded.requirement_value, experience_reward = excluded.experience_reward;

commit;
