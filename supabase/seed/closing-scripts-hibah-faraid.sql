-- Seeded from the agency's hibah script library. Re-runnable: a
-- re-seed updates the wording in place for this script_set rather than
-- duplicating, so a SuperAdmin's later edits are the ones at risk, never
-- the row identity.
insert into takaful_scripts (script_set, script_no, chapter, chapter_order, situation, body, why, tags, sort_order)
values
('hibah_faraid', 1, 'Buka Perbualan Tentang Keluarga dan Tanggungjawab', 0, 'Prospek baru ada anak atau keluarga yang bergantung pada pendapatan dia', '{{Name}}, sejak ada [anak/baby baru/family], perancangan kewangan mesti rasa lain sikit kan 🙂

Kalau boleh saya tanya santai je: sekiranya pendapatan awak tiba-tiba terhenti sementara atas musibah luar jangka, simpanan kecemasan keluarga boleh bertahan berapa bulan untuk tampung belanja dapur & komitmen sedia ada?

Kita sembang santai je, tengok keadaan semasa.', 'Mulakan dengan realiti aliran tunai dan belanja harian keluarga, bukan guna taktik menakut-nakutkan pasal kematian. Soalan terbuka bantu prospek menilai ketahanan tabung kecemasan sendiri.', array['buka perbualan tentang keluarga dan tanggungjawab']::text[], 0),
('hibah_faraid', 2, 'Buka Perbualan Tentang Keluarga dan Tanggungjawab', 0, 'Prospek sebut akaun bank atau harta mungkin lambat diurus selepas kematian', 'Betul {{Name}}, urusan harta dan akaun memang ada proses dia sendiri 🙂

Sebab tu ramai asingkan perbincangan cash flow keluarga daripada urusan pusaka. Untuk faraid atau dokumen, rujuk peguam atau pihak bertauliah. Saya explain dulu macam mana hibah biasanya dibincangkan dalam pelan takaful.', 'Akui kebimbangan akaun dibekukan tanpa membuat tafsiran perundangan sendiri. Bezakan peranan dana kecemasan cair (hibah takaful) dengan pembahagian harta pusaka am.', array['buka perbualan tentang keluarga dan tanggungjawab']::text[], 1),
('hibah_faraid', 3, 'Buka Perbualan Tentang Keluarga dan Tanggungjawab', 0, 'Prospek tanya beza hibah, faraid dan wasiat', 'Soalan bagus {{Name}} 🙂 Hibah, faraid dan wasiat bukan benda yang sama.

Setiap satu ada fungsi dan syarat ikut keadaan keluarga. Saya explain bahagian hibah dalam pelan takaful. Untuk keputusan pusaka atau dokumen, rujuk perancang harta atau peguam bertauliah.', 'Jangan jadikan topik ini sebagai nasihat undang-undang atau fatwa. Terangkan perbezaan fungsi instrumen secara asas dan arahkan kepada pihak bertauliah untuk urusan dokumentasi pusaka.', array['buka perbualan tentang keluarga dan tanggungjawab']::text[], 2),
('hibah_faraid', 4, 'Buka Perbualan Tentang Keluarga dan Tanggungjawab', 0, 'Breadwinner ada rumah, kereta atau hutang keluarga', '{{Name}}, kalau campur ansuran rumah, kereta dengan nafkah keluarga, komitmen bulanan sekarang sekitar RM[jumlah] sebulan kan?

Saya selalu ajak orang kira: berapa tahun keluarga perlukan dana sara hidup untuk terus ''bernafas'' tanpa perlu tergesa-gesa jual aset atau buat hutang baru kalau apa-apa jadi.

Lepas nampak angka keperluan tu, baru kita tengok pelan hibah yang padan dengan bajet bulanan.', 'Fokus pada aliran komitmen sebenar yang akan ditinggalkan, bukan mendakwa hibah boleh selesaikan semua hutang serta-merta. Ini membuka ruang untuk kiraan yang lebih realistik.', array['buka perbualan tentang keluarga dan tanggungjawab']::text[], 3),
('hibah_faraid', 5, 'Buka Perbualan Tentang Keluarga dan Tanggungjawab', 0, 'Prospek bujang kata hibah belum perlu', 'Faham sangat {{Name}}, bila belum kahwin atau belum ada anak, memang rasa topik hibah ni jauh lagi 🙂

Cuma kalau awak ada tolong hulur belanja bulanan untuk mak ayah kat kampung, tanggung adik belajar, atau ada komitmen pinjaman peribadi/kereta, elok ada dana penampung supaya tak bebankan keluarga kalau musibah datang.

Tapi kalau memang langsung takde tanggungan atau komitmen, saya cakap terus terang: fokus medical card dulu pun dah memadai.', 'Hormati status bujang tanpa memaksa. Buka sudut pandang tentang nafkah ibu bapa, hutang peribadi, atau tanggungan adik-beradik hanya jika berkaitan.', array['buka perbualan tentang keluarga dan tanggungjawab']::text[], 4),
('hibah_faraid', 6, 'Bincang, Semak dan Tutup Dengan Berhemah', 1, 'Prospek perlu bincang dengan suami atau isteri', 'Sangat setuju {{Name}}, bab hibah ni memang wajib bincang hati ke hati dengan pasangan 🙂

Bagi memudahkan, saya sediakan ringkasan 1 muka surat yang ringkas: tujuan perlindungan, jumlah pampasan, caruman ikut bajet, dan syarat penamaan.

Awak forward kat [suami/isteri] dulu. Kalau ada bahagian yang dia musykil, kita boleh call santai bertiga dalam 10 minit.', 'Keputusan hibah menyentuh masa depan keluarga, jadi perbincangan bersama pasangan adalah wajar. Sediakan ringkasan 1 muka surat tanpa memintas pasangan.', array['bincang, semak dan tutup dengan berhemah']::text[], 5),
('hibah_faraid', 7, 'Bincang, Semak dan Tutup Dengan Berhemah', 1, 'Prospek dah ada takaful tetapi tak pasti penamaan atau manfaat hibah', 'Bagus sebab dah ada pelan {{Name}} 🙂 Cuma ramai terlepas pandang status penama, ada yang letak sebagai ''Wasi/Pelaksana'' (kena faraidkan), dan ada yang dah buat ''Hibah Bersyarat'' (hak mutlak penerima).

Kalau sudi, hantar screenshot bahagian penama atau nama pelan tu. Saya tolong semakkan apa status dokumen semasa awak, lepas tu baru awak tahu soalan apa nak tanya kat syarikat.', 'Jangan buat andaian penama automatik menjadi penerima hibah. Semak dokumen polisi semasa dan bantu prospek fahami status penamaan.', array['bincang, semak dan tutup dengan berhemah']::text[], 6),
('hibah_faraid', 8, 'Bincang, Semak dan Tutup Dengan Berhemah', 1, 'Prospek risau caruman hibah akan tambah beban bulanan', 'Betul sangat {{Name}}, pelan perlindungan tak patut buatkan poket kita semput bulan-bulan 🙂

Cuba bagi range bajet bulanan yang betul-betul selesa untuk awak, contohnya RM[range]. Saya susunkan pilihan ikut jadual rasmi.

Kalau lepas tengok rasa masih membebankan, kita tak teruskan pun takpe, takde paksaan.', 'Caruman hibah kena ukur baju di badan sendiri. Gunakan jadual sebut harga rasmi dan beri ruang untuk prospek menolak jika tidak selesa.', array['bincang, semak dan tutup dengan berhemah']::text[], 7),
('hibah_faraid', 9, 'Bincang, Semak dan Tutup Dengan Berhemah', 1, 'Prospek tanya sama ada hibah pasti sampai cepat kepada waris', 'Saya cakap terus terang ya {{Name}}, saya tak boleh jamin tempoh atau hasil untuk setiap kes 🙂

Yang saya boleh: terangkan proses tuntutan ikut terma pelan, dokumen yang biasanya diperlukan, dan kenapa maklumat penama kena sentiasa disemak. Untuk isu pusaka, rujuk pihak bertauliah.', 'Elakkan memberi jaminan tempoh masa tuntutan atau kepastian undang-undang. Terangkan prosedur dokumentasi dan peranan penamaan secara telus.', array['bincang, semak dan tutup dengan berhemah']::text[], 8),
('hibah_faraid', 10, 'Bincang, Semak dan Tutup Dengan Berhemah', 1, 'Follow up terakhir selepas prospek terima illustration hibah', 'Hai {{Name}}, saya buat susulan ringkas ni je ya 🙂

Kalau awak dan keluarga dah ready nak teliti semula jadual cadangan hibah hari tu, roger je saya balik bila-bila masa. Kalau rasa belum waktu yang sesuai, no problem langsung.

Simpan je nombor saya ni, nanti bila-bila perlukan maklumat, WhatsApp je ya.', 'Buat susulan profesional tanpa mendesak atau memainkan emosi ketakutan. Tinggalkan pintu perbualan terbuka untuk prospek berbincang mengikut masa keluarga.', array['bincang, semak dan tutup dengan berhemah']::text[], 9),
('hibah_faraid', 11, 'Objection: "Faraid Cukup / Nominee / Harta Sikit"', 2, '"Harta sikit je, tak payah hibah"', 'Faham {{Name}}, ramai ingat hibah ni untuk orang yang ada tanah je 🙂

Hibah dalam pelan ni bukan pasal kaya atau tak. Dia pasal siapa family nak lindungi dari segi manfaat takaful, ikut terma. Bagi range bajet yang selesa. Kalau illustration tak masuk akal, kita stop.', 'Jangan perkecilkan situasi prospek atau paksa angka perlindungan yang luar kemampuan. Hibah dalam pelan ni ikut terma, bukan janji duit cepat.', array['objection · faraid cukup / nominee / harta sikit']::text[], 10),
('hibah_faraid', 12, 'Objection: "Faraid Cukup / Nominee / Harta Sikit"', 2, '"Ustaz / family kata faraid dah cukup"', 'Saya hormat sangat pandangan tu {{Name}} 🙂 Faraid memang hukum pembahagian pusaka yang adil dalam Islam.

Cuma urusan faraid memerlukan masa untuk kumpul waris dan selesaikan dokumentasi pusaka. Hibah takaful ni bertindak sebagai dana kecemasan tunai untuk sara hidup waris sementara nak tunggu faraid selesai.

Untuk bab hukum terperinci, elok awak semak dengan ustaz atau pihak bertauliah yang awak percaya. Saya cuma kongsikan fakta dokumen pelan je.', 'Jangan berdebat tentang hukum faraid. Posisikan hibah takaful bukan sebagai pengganti faraid, tetapi sebagai dana kecemasan tunai sementara menunggu proses pusaka selesai.', array['objection · faraid cukup / nominee / harta sikit']::text[], 11),
('hibah_faraid', 13, 'Objection: "Faraid Cukup / Nominee / Harta Sikit"', 2, '"Dah ada nominee dalam polisi, sama je dengan hibah"', 'Ramai yang salah faham bab ni {{Name}} 🙂 Dalam dokumen takaful, ada beza besar antara Penama sebagai ''Wasi/Pelaksana'' dengan Penama sebagai ''Penerima Hibah''.

Kalau setakat wasi, duit pampasan tu wajib dibahagikan ikut faraid kepada semua waris. Tapi kalau dibuat atas nama hibah bersyarat, pampasan tu jadi hak milik mutlak orang yang dinamakan.

Nak saya tolong semakkan apa status penamaan dalam polisi awak sekarang?', 'Perjelaskan kekeliruan antara ''penama sebagai wasi'' (pemegang amanah untuk faraid) dengan ''penama sebagai penerima hibah mutlak'' mengikut Akta Perkhidmatan Kewangan Islam (IFSA 2013).', array['objection · faraid cukup / nominee / harta sikit']::text[], 12),
('hibah_faraid', 14, 'Objection: "Faraid Cukup / Nominee / Harta Sikit"', 2, 'Taknak cakap pasal hibah sebab nampak macam nak mati', 'Faham sangat {{Name}}, topik ni memang rasa berat dan pantang bagi sesetengah orang 🙂

Kita tak bincang pasal mati pun; kita bincang pasal jaminan hidup untuk orang yang kita sayang. Hibah ni macam payung pelindung, supaya kalau kita dah tak mampu bekerja nanti, anak-anak dan pasangan masih boleh teruskan hidup dengan selesa.

Kalau awak rasa belum selesa nak sembang sekarang, kita park dulu ya, no problem.', 'Validasi rasa berat atau pantang bila menyentuh topik kematian. Alihkan fokus kepada kelangsungan nafkah hidup insan tersayang.', array['objection · faraid cukup / nominee / harta sikit']::text[], 13),
('hibah_faraid', 15, 'Objection: "Faraid Cukup / Nominee / Harta Sikit"', 2, 'Situasi poligami / anak lain ibu / keluarga bercampur', 'Faham {{Name}}, struktur keluarga yang bercampur memang memerlukan susunan yang lebih cermat supaya kebajikan semua pihak terpelihara 🙂

Dalam takaful, awak boleh tentukan peratusan penama hibah secara spesifik mengikut siapa yang awak nak bantu. Untuk pembahagian harta sepencarian atau pusaka luar, tetap kena rujuk peguam syarie atau perancang harta bertauliah.

Kita susun bahagian pelan takaful ni bagi kemas dan jelas dulu.', 'Kekalkan profesionalisme tanpa menghakimi (*no judgment*). Semak pembahagian penama secara telus dan arahkan isu pembahagian pusaka luar kepada peguam syarie.', array['objection · faraid cukup / nominee / harta sikit']::text[], 14),
('hibah_faraid', 16, 'Objection: "Faraid Cukup / Nominee / Harta Sikit"', 2, 'Taknak sibling / waris tahu, takut berbalah', 'Saya faham sangat kerisauan tu {{Name}}, bab harta dan waris ni memang sensitif 🙂

Segala perbincangan dan dokumen ni adalah rahsia antara awak dengan saya je. Mengikut undang-undang takaful, penamaan hibah adalah hak peribadi pencarum.

Dokumen yang sah dan jelas dapat bantu kurangkan kekeliruan di kemudian hari, walaupun kita tak boleh kawal reaksi orang lain. Privasi awak adalah keutamaan saya.', 'Jaga kerahsiaan maklumat prospek sepenuhnya. Jangan minta kontak waris tanpa izin dan elakkan memberi janji palsu bahawa tiada pertikaian akan berlaku.', array['objection · faraid cukup / nominee / harta sikit']::text[], 15),
('hibah_faraid', 17, 'Situasi Live: Kematian Family, Tukar Penama, Peguam', 3, 'Ada kematian dalam family, dia WhatsApp. Jangan menjual!', 'Inna lillahi wa inna ilaihi raji''un... Salam takziah {{Name}}. Semoga awak dan seluruh keluarga tabah hadapi ujian ni 🤲

Malam ni bukan masa untuk kita bincang apa-apa pelan baru. Kalau ada sebarang urusan dokumen polisi sedia ada yang perlukan bantuan saya untuk uruskan dengan pihak syarikat, maklumkan bila-bila masa.

Berehat dan tumpukan pada keluarga dulu ya. Saya ada kat sini kalau perlukan bantuan.', 'Berikan ucapan takziah dan empati yang ikhlas. Tawarkan bantuan semakan dokumen tuntutan tanpa menyelitkan sebarang promosi jualan produk baharu.', array['situasi live']::text[], 16),
('hibah_faraid', 18, 'Situasi Live: Kematian Family, Tukar Penama, Peguam', 3, 'Nak tukar penama lepas kahwin, cerai, atau dapat anak baru', 'Noted / Tahniah {{Name}} 🙂 Bila ada perubahan fasa hidup, memang langkah tepat untuk kemas kini penama dalam polisi.

Penukaran ni perlu dibuat melalui borang rasmi atau portal pelanggan syarikat. Saya boleh kongsikan borang penukaran penama dan pandukan bahagian mana yang perlu diisi.

Lepas syarikat keluarkan surat pengesahan, baru rekod penama tu sah dikemas kini dalam sistem.', 'Pandu prospek melalui saluran rasmi syarikat. Jangan buat janji bahawa penukaran penama boleh diselesaikan hanya melalui mesej sembang WhatsApp.', array['situasi live']::text[], 17),
('hibah_faraid', 19, 'Situasi Live: Kematian Family, Tukar Penama, Peguam', 3, 'Mak/ayah/group tanya "ni riba ke, haram ke?"', 'Persoalan yang sangat wajar {{Name}} 🙂 Saya advisor, bukan ustaz, jadi saya tak keluarkan hukum dari mulut sendiri.

Yang boleh: saya hantar nama syarikat, jenis pelan, dan dokumen rasmi termasuk sijil syariah kalau syarikat ada. Family semak dengan ustaz yang mereka percaya. Kalau lepas tu masih tak selesa, kita tak force.', 'Advisor bukan ustaz. Hantar dokumen rasmi syarikat; biar family semak dengan sumber yang mereka percaya.', array['situasi live']::text[], 18),
('hibah_faraid', 20, 'Situasi Live: Kematian Family, Tukar Penama, Peguam', 3, 'Dia nak bawa peguam / perancang harta. Advisor tahu batas tugas', 'Bagus sangat langkah tu {{Name}} 🙂 Memang elok dapatkan pandangan peguam atau perancang harta pusaka bertauliah untuk susun keseluruhan aset awak.

Tugas saya sediakan fakta teknikal pelan takaful: jumlah pampasan, caruman bulanan ikut jadual rasmi, dan syarat penamaan hibah. Pihak peguam boleh masukkan maklumat ni ke dalam perancangan pusaka penuh keluarga awak.

Kalau peguam nak adakan sesi perbincangan ringkas bertiga pun dialu-alukan.', 'Sambut baik penglibatan profesional lain. Sediakan ringkasan fakta pelan takaful tanpa mencampuri nasihat perundangan pusaka.', array['situasi live']::text[], 19)
on conflict (script_set, script_no) do update set
  chapter = excluded.chapter,
  chapter_order = excluded.chapter_order,
  situation = excluded.situation,
  body = excluded.body,
  why = excluded.why,
  tags = excluded.tags,
  sort_order = excluded.sort_order;
