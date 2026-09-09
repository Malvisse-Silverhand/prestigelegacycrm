-- Seeded from the agency's script library. Re-runnable: a re-seed updates
-- the wording in place rather than duplicating, so a SuperAdmin's edits are
-- the ones at risk, never the row identity.
insert into takaful_scripts (script_no, chapter, chapter_order, situation, body, why, tags, sort_order)
values
(1, 'Prospecting: Buka Perbualan Tanpa Bunyi Ejen', 0, 'DM pertama pada kenalan lama (warm market)', 'Eh {{Name}}, lama tak borak 🙂 Nampak awak [perkara daripada story/post dia, cth: baru pindah rumah / baru tukar kerja]. Tahniah!

Macam mana sekarang? Semua urusan okay ke?', 'Mulakan dengan perkembangan hidup dia dulu secara natural. Jangan terus menjual atau sebut pasal takaful dalam mesej pertama.', array['prospecting']::text[], 0),
(2, 'Prospecting: Buka Perbualan Tanpa Bunyi Ejen', 0, 'Sambungan bila dia dah reply mesra', 'Alhamdulillah, seronok dengar semua okay 🙂

By the way, sekarang saya ada buat servis takaful dan medical card. Kalau awak atau family tengah survey nak buat baru, atau saja nak semak balik plan yang sedia ada, roger je saya. Saya boleh tolong semakkan dulu secara santai, takde komitmen apa-apa pun.', 'Bila hubungan dah panas balik, buka pintu servis secara santai tanpa letak sebarang tekanan atau komitmen.', array['prospecting']::text[], 1),
(3, 'Prospecting: Buka Perbualan Tanpa Bunyi Ejen', 0, 'Cold DM pada stranger (dari group/mutual)', 'Salam {{Name}}, saya {{Agent}} dari [syarikat]. Kita sama-sama ada dalam [group/tempat berkenalan] 🙂

Boleh saya tanya satu soalan ringkas? Awak pernah check tak berapa limit coverage medical card awak sekarang?

Saya tanya sebab ramai dah ada plan, tapi jarang tengok limit tu masih relevan ke tak dengan kos rawatan sekarang.', 'Nyatakan persamaan group tempat berkenalan dan tanya soalan spesifik pasal had perlindungan untuk cetus kesedaran.', array['prospecting']::text[], 2),
(4, 'Prospecting: Buka Perbualan Tanpa Bunyi Ejen', 0, 'Prospek tanya "Awak jual insurance ke?" (nada defensif)', 'Ya betul, saya advisor dengan [syarikat] 🙂

Pendekatan saya santai je: saya tolong semak dulu plan yang awak dah ada. Kalau coverage dengan bayaran bulanan dah memang cantik, saya cakap okay terus. Cuma kalau ada gap atau kelompangan, baru saya terangkan pilihan yang ada.', 'Jangan mengelak atau pertikai soalan dia. Mengaku dengan yakin dan jelaskan pendekatan kita yang menyemak dokumen, bukan memaksa beli.', array['prospecting']::text[], 3),
(5, 'Prospecting: Buka Perbualan Tanpa Bunyi Ejen', 0, 'Follow-up prospek baru yang "seen" je DM pertama', 'Hai {{Name}}, saja follow up ringkas ya 🙂

Kalau awak nak saya tolong buat kiraan anggaran coverage ikut umur dan bajet semasa, balas je "nak". Nanti saya hantarkan ringkasan santai kat sini.', 'Rendahkan halangan untuk membalas (*low friction*). Beri tawaran kiraan mudah dengan balasan satu perkataan sahaja.', array['prospecting']::text[], 4),
(6, 'Set Appointment: Dari Chat ke Jumpa / Call', 1, 'Prospek berminat, nak bawa ke sesi 15–20 minit', '{{Name}}, daripada saya taip berjela-jela kat WhatsApp ni, apa kata kita call santai dalam 15 ke 20 minit? Senang awak nak tanya terus 🙂

Saya ada slot free [hari] [masa 1] atau [hari] [masa 2]. Mana satu yang senang untuk awak?', 'Elakkan berbalas teks berjela-jela yang memenatkan. Tawarkan panggilan pendek dengan pilihan masa yang terhad (*alternative close*).', array['set appointment']::text[], 5),
(7, 'Set Appointment: Dari Chat ke Jumpa / Call', 1, 'Dia kata "WhatsApp je lah, tak payah jumpa/call"', 'Boleh, takde hal {{Name}}. Kita borak kat WhatsApp dulu 🙂

Nanti kalau awak rasa banyak benda teknikal nak kena explain, baru kita roger call kejap 15 minit biar jelas. Kalau lepas sembang kat sini awak rasa belum sesuai, kita stop je kat situ, no problem.', 'Hormati pilihan prospek supaya dia tak rasa terancam, sambil tinggalkan pilihan untuk bersambung ke panggilan jika topik jadi rumit.', array['set appointment']::text[], 6),
(8, 'Set Appointment: Dari Chat ke Jumpa / Call', 1, 'Dah set masa, nak kurangkan risiko no-show', 'Okay cun, saya dah lock slot [hari] [masa] untuk kita borak 🙂

Sebelum tu, saya hantarkan 4 soalan ringkas ya. Nanti masa sesi call, kita boleh terus fokus pada point yang paling penting untuk awak.', 'Kunci komitmen masa dan hantar soalan pra-call (4 soalan, skrip 72) supaya perbincangan nanti terus masuk ke perkara utama.', array['set appointment']::text[], 7),
(9, 'Set Appointment: Dari Chat ke Jumpa / Call', 1, 'Reminder sehari sebelum appointment', 'Hai {{Name}}, peringatan santai untuk sesi call kita esok jam [masa] ya 🙂

Saya dah siapkan semakan awal ikut umur dan situasi awak. Kalau tiba-tiba ada hal kecemasan atau nak ubah masa, WhatsApp saya awal ya supaya saya boleh adjust jadual.', 'Beri peringatan sopan sehari sebelum sesi berserta nilai persediaan yang dah dibuat untuk elak pembatalan saat akhir.', array['set appointment']::text[], 8),
(10, 'Set Appointment: Dari Chat ke Jumpa / Call', 1, 'Dia no-show, nak selamatkan tanpa guilt-trip', 'Hai {{Name}}, tadi kita tak sempat nak call. Harap semuanya okay kat sana 🙂

Kalau awak masih nak teruskan semakan hari tu, saya ada masa terluang [hari] [masa]. Agak-agak waktu tu sesuai tak untuk awak?', 'Elakkan menyalahkan prospek bila dia terlepas temujanji. Utamakan empati dan buka peluang untuk jadualkan semula.', array['set appointment']::text[], 9),
(11, 'Objection: "Saya Dah Ada Polisi"', 2, '"Saya dah ada insurance/takaful" (jawapan standard)', 'Alhamdulillah, bagus sangat awak dah ada perlindungan sedia ada 🙂 Last sekali semak polisi tu bila ya?

Kalau dah lebih 2-3 tahun lepas, mungkin ada syarat atau limit yang dah tak match dengan kos hospital sekarang. Kalau awak sudi, saya boleh tolong semakkan. Polisi kekal je dengan ejen lama awak, saya tolong ''terjemahkan'' apa isi dokumen tu je.', 'Raikan tindakan bijak dia yang dah ada polisi. Bawa perbualan ke arah semakan had semasa tanpa niat merampas klien ejen lain.', array['objection · saya dah ada polisi']::text[], 10),
(12, 'Objection: "Saya Dah Ada Polisi"', 2, 'Lepas semak polisi dia, jumpa gap sebenar', '{{Name}}, saya dah siap teliti dokumen polisi awak hari tu. Bahagian yang dah kukuh memang dah elok sangat 🙂

Cuma saya perasan ada satu gap kat bahagian [bahagian khusus, cth: had tahunan / penyakit kritikal]. Nak saya tunjukkan pilihan cadangan untuk cover bahagian gap tu? Awak tengok dulu macam mana, lepas tu baru decide.', 'Puji bahagian polisi yang dah kukuh dahulu sebelum membentangkan jurang perlindungan secara objektif berasaskan dokumen.', array['objection · saya dah ada polisi']::text[], 11),
(13, 'Objection: "Saya Dah Ada Polisi"', 2, '"Company saya dah cover" (group insurance majikan)', 'Benefit company cover ni memang sangat membantu jimat duit {{Name}} 🙂

Cuma satu perkara: coverage majikan ni biasanya terikat dengan tempoh awak kerja kat situ. Kalau tukar kerja, rehat, atau bersara, manfaat boleh berubah atau tamat.

Nak saya compare dengan plan sendiri ikut rate semasa? Kita tengok dokumen, bukan teka.', 'Akui manfaat syarikat. Semak dokumen: group cover boleh berubah atau tamat bila status kerja berubah. Jangan scare-sell.', array['objection · saya dah ada polisi']::text[], 12),
(14, 'Objection: "Saya Dah Ada Polisi"', 2, '"Ejen saya tu kawan rapat / family sendiri"', 'Faham sangat {{Name}}, kalau ejen tu kawan baik atau family memang wajar awak utamakan dia 🙂 Saya pun tak berniat nak ganggu hubungan tu.

Cuma kalau awak perlukan second opinion secara bebas dan objektif, saya boleh tolong semakkan manfaat polisi. Lepas tu awak boleh bawa point semakan tu untuk bincang balik dengan ejen awak.', 'Hormati hubungan kekeluargaan atau persahabatan prospek. Posisikan diri sebagai penyemak bebas (*second opinion*).', array['objection · saya dah ada polisi']::text[], 13),
(15, 'Objection: "Saya Dah Ada Polisi"', 2, '"Polisi lama dah nak habis bayar, malas fikir dah"', 'Wah, tahniah dah nak selesai bayar! Lega rasa bila komitmen dah nak habis 🙂

Cuma sebelum awak selesa, elok kita double check macam mana polisi tu beroperasi lepas tamat tempoh caruman. Setiap polisi ada syarat berbeza pasal coverage hospital waktu usia warga emas. Boleh forward ringkasan polisi kat saya, biar saya tolong semakkan.', 'Ucapkan tahniah kerana komitmen bayaran hampir tamat, kemudian ajak semak terma perlindungan perubatan selepas tamat tempoh caruman.', array['objection · saya dah ada polisi']::text[], 14),
(16, 'Objection: "Nak Fikir Dulu / Tanya Pasangan"', 3, '"Nak fikir dulu" selepas terima quotation', 'Boleh, tiada masalah {{Name}} 🙂 Ambil masa dulu untuk teliti.

Sebelum tu, ada bahagian yang rasa macam masih tergantung atau tak clear ke? Dari segi bayaran bulanan, skop coverage, atau awak tengah compare dengan pelan lain? Senang saya perjelaskan point yang awak risaukan tu.', 'Beri ruang untuk prospek berfikir, sambil cungkil punca keraguan sebenar (bajet, manfaat, atau perbandingan).', array['objection · nak fikir dulu / tanya pasangan']::text[], 15),
(17, 'Objection: "Nak Fikir Dulu / Tanya Pasangan"', 3, '"Kena bincang dengan suami/isteri dulu"', 'Terbaik {{Name}}, memang wajib bincang dengan pasangan dulu hal macam ni 🙂

Bagi memudahkan, saya boleh sediakan ringkasan 1 page yang pendek untuk awak forward terus: apa manfaat utama, berapa bayaran bulanan, dan apa syarat penting. Biar pasangan awak senang baca fakta yang penting tanpa pening kepala.', 'Sokong perbincangan bersama pasangan dan sediakan ringkasan mudah difahami untuk memudahkan komunikasi mereka di rumah.', array['objection · nak fikir dulu / tanya pasangan']::text[], 16),
(18, 'Objection: "Nak Fikir Dulu / Tanya Pasangan"', 3, 'Follow up 3 hari selepas "nak fikir", masih senyap', 'Hai {{Name}}, sempat tengok sebut harga yang saya share hari tu? 🙂

Quotation tu biasanya ikut kiraan umur sekarang dan sah sampai [tarikh sebenar]. Kalau ada bahagian yang rasa pening atau tak faham, tanya je saya kat sini. Lepas tarikh tu, saya kena semak balik sistem kalau-kalau ada perubahan.', 'Buat susulan bersandarkan tempoh sah sebut harga tanpa mendesak secara kasar.', array['objection · nak fikir dulu / tanya pasangan']::text[], 17),
(19, 'Objection: "Nak Fikir Dulu / Tanya Pasangan"', 3, 'Pasangan yang tak setuju', 'Faham {{Name}}, normal bila pasangan ada rasa risau 🙂

Agak-agak dia lebih risaukan pasal komitmen bayaran bulanan, atau dia belum nampak kenapa perlindungan ni penting untuk family?

Kalau awak share puncanya, senang saya bantu susun fakta untuk jawab risau dia tu. Kalau senang, kita boleh call santai bertiga kejap.', 'Kenal pasti punca kerisauan pasangan sama ada isu komitmen kewangan atau ketidakfahaman fungsi pelan.', array['objection · nak fikir dulu / tanya pasangan']::text[], 18),
(20, 'Objection: "Nak Fikir Dulu / Tanya Pasangan"', 3, '"Nanti lah, saya masih muda & sihat lagi"', 'Betul {{Name}}, waktu tengah sihat dan muda ni memang kita rasa benda ni lambat lagi 🙂

Cuma umur dengan rekod kesihatan masa apply boleh affect caruman dan underwriting. Syarikat yang decide. Kalau awak nak, saya tunjuk illustration rasmi untuk umur sekarang. Dari situ senang nak compare.', 'Terangkan faktor yang benar-benar mempengaruhi permohonan menggunakan ilustrasi rasmi. Elakkan janji harga kekal atau lulus senang.', array['objection · nak fikir dulu / tanya pasangan']::text[], 19),
(21, 'Objection: "Mahal / Tak Mampu Bulan Ni"', 4, '"Mahal lah" (respons pertama lepas tengok sebut harga)', 'Faham {{Name}} 🙂 Yang rasa mahal tu sebab tak muat dalam bajet bulanan sekarang, atau sebab rasa nilai perlindungan tu belum sepadan dengan harganya?

Kalau isu bajet, bagitahu je berapa range sebulan yang betul-betul selesa untuk poket awak. Saya akan susun semula pilihan ikut kemampuan semasa.', 'Asingkan sama ada isu tersebut adalah masalah bajet sebenar atau prospek belum nampak nilai manfaatnya.', array['objection · mahal / tak mampu bulan ni']::text[], 20),
(22, 'Objection: "Mahal / Tak Mampu Bulan Ni"', 4, 'Prospek nak coverage penuh tapi bajet terhad', 'Saya cakap terus-terang je ya {{Name}} 🙂 Dengan bajet RM[jumlah] sebulan, kita memang tak dapat ambil semua rider serentak.

Apa kata kita mula dulu dengan perlindungan asas yang paling kritikal iaitu [keutamaan ikut keperluan, cth: bil perubatan hospital]. Nanti bila bajet awak dah makin longgar, baru kita tambah bahagian lain. Awak okay kalau kita susun ikut keutamaan dulu?', 'Nyatakan realiti secara jujur bahawa bajet terhad tidak boleh dapat semua manfaat, kemudian cadangkan bermula dengan perlindungan asas yang paling kritikal dahulu.', array['objection · mahal / tak mampu bulan ni']::text[], 21),
(23, 'Objection: "Mahal / Tak Mampu Bulan Ni"', 4, 'Bandingkan dengan belanja harian (reframe harga)', 'Kalau dipecahkan, RM[jumlah sebulan] tu jatuh sekitar RM[jumlah sehari] je sehari, lebih kurang harga secawan kopi 🙂

Tapi apa-apa pun, bajet bulanan tetap kena selesa kat poket awak. Kalau jumlah tu rasa berat, jangan paksa; bagitahu saya, kita ubah suai pelan ni bagi ngam.', 'Pecahkan komitmen bulanan kepada nilai harian untuk mengecilkan saiz bebanan psikologi.', array['objection · mahal / tak mampu bulan ni']::text[], 22),
(24, 'Objection: "Mahal / Tak Mampu Bulan Ni"', 4, '"Bulan ni tight sangat: raya / yuran sekolah / banyak komitmen"', 'Faham sangat {{Name}}, bulan ni memang banyak komitmen serentak 🙂

Kalau syarikat benarkan perlindungan bermula [bulan hadapan], saya boleh tolong aturkan. Saya semak tarikh bayaran pertama yang fleksibel supaya tak ganggu belanja dapur awak bulan ni, lepas tu baru awak buat keputusan.', 'Fahami kekangan tunai bermusim dan tawarkan pelarasan tarikh permulaan caruman yang dibenarkan sistem.', array['objection · mahal / tak mampu bulan ni']::text[], 23),
(25, 'Objection: "Mahal / Tak Mampu Bulan Ni"', 4, 'Dia banding dengan pelan direct/online yang lebih murah', 'Ya betul, pelan beli direct online memang ada yang nampak lebih murah kat atas kertas 🙂

Cuma sebelum pilih, pastikan awak semak 4 benda ni: had tahunan, penyakit yang dikecualikan (exclusion), caj ko-takaful, dan siapa yang akan bantu awak uruskan dokumen masa admitted kat hospital nanti.

Dengan pelan berpenasihat, tugas saya tolong susun dokumen dan pantau proses tuntutan supaya awak tak pening kepala masa sakit.', 'Akui harga pelan dalam talian yang kelihatan murah, tetapi tekankan nilai khidmat nasihat, had tuntutan, dan bantuan dokumen semasa kecemasan.', array['objection · mahal / tak mampu bulan ni']::text[], 24),
(26, 'Follow-Up Siri Panjang: Jangan Mati Awal', 5, 'Minggu 1: Bawa perkembangan baru, bukan sekadar "Macam mana?"', 'Hai {{Name}}, baru-baru ni saya ada bantu seorang client uruskan tuntutan [jenis tuntutan, cth: rawatan appendix]. Proses tu ambil [tempoh sebenar], ikut dokumen dan semakan company.

Tiba-tiba teringat perbualan kita pasal medical card hari tu. Harap awak sekeluarga sihat selalu ya 🙂', 'Bawa cerita kejayaan tuntutan sebenar untuk menunjukkan fungsi praktikal pelan tanpa mendesak jawapan.', array['follow-up']::text[], 25),
(27, 'Follow-Up Siri Panjang: Jangan Mati Awal', 5, 'Minggu 2–3: Kongsi info bermanfaat (soft value drop)', 'Hai {{Name}}, saya ada terbaca info ni daripada sumber rasmi dan terus teringat awak:

[Satu fakta berguna, cth: kadar inflasi kos rawatan hospital terkini / perubahan syarat kemasukan wad].

Saja saya kongsikan kat sini, moga bermanfaat untuk rujukan awak semak polisi peribadi.', 'Kongsi maklumat industri atau tip kewangan berguna daripada sumber rasmi untuk kekalkan interaksi bernilai.', array['follow-up']::text[], 26),
(28, 'Follow-Up Siri Panjang: Jangan Mati Awal', 5, 'Prospek senyap sebulan, cara hidupkan balik chat', 'Hai {{Name}}, saya tengah susun fail dan terjumpa balik nota semakan pelan yang kita bincang bulan lepas 🙂

Kalau awak nak sambung tengok pilihan tu, saya boleh kemas kini sebut harga terbaru. Tapi kalau belum bersedia atau masa belum sesuai, takpe sangat. Bila-bila dah lapang nanti, roger je saya ya.', 'Hidupkan semula perbualan secara bersahaja berasaskan semakan fail lama tanpa nada menyindir.', array['follow-up']::text[], 27),
(29, 'Follow-Up Siri Panjang: Jangan Mati Awal', 5, 'Guna momentum musim (raya / tahun baru / hari jadi)', 'Selamat [musim/perayaan/hari lahir], {{Name}}! 🙂 Semoga sentiasa dimurahkan rezeki, sihat tubuh badan, dan semua urusan dipermudahkan.

By the way, kalau satu masa nanti awak nak sambung balik semakan pelan takaful yang kita sembang dulu, bagitahu je ya. Saya boleh tolong kemas kini ikut situasi terkini awak.', 'Gunakan ucapan perayaan atau hari lahir secara tulus sebagai jambatan untuk membuka semula peluang semakan.', array['follow-up']::text[], 28),
(30, 'Follow-Up Siri Panjang: Jangan Mati Awal', 5, 'Follow-up terakhir sebelum "park" (breakup message)', 'Hai {{Name}}, saya tutup susulan aktif saya kat sini dulu ya supaya tak ganggu masa awak 🙂

Kalau satu hari nanti awak nak semak semula polisi atau perlukan apa-apa bantuan pasal takaful, pintu WhatsApp saya sentiasa terbuka. Terima kasih banyak sudi luangkan masa borak dengan saya sebelum ni!', 'Tutup susulan aktif secara profesional, tanpa guilt-trip. Pintu kekal terbuka jika prospek mahu kembali kemudian.', array['follow-up']::text[], 29),
(31, 'Follow-Up Siri Panjang: Jangan Mati Awal', 5, 'Bila prospek balas balik selepas lama menyepi', 'Hai {{Name}}, seronok dapat dengar khabar awak balik! 🙂

Quotation lama tu elok saya semak semula dalam sistem sebab mungkin dah luput tarikh. Saya update ikut info terkini dulu, lepas tu kita tengok sama-sama ya. Awak ada masa lapang bila minggu ni?', 'Sambut prospek dengan mesra tanpa mengungkit tempoh dia mendiamkan diri, dan cadangkan semakan terkini.', array['follow-up']::text[], 30),
(32, 'Closing: Dari Setuju ke Pendaftaran', 6, 'Dia dah puas hati, masa mulakan permohonan', 'Alhamdulillah {{Name}}, semua persoalan utama dah terjawab dengan jelas 🙂 Kalau awak dah sedia nak proceed, proses dia sangat mudah:

1. Saya hantar link permohonan rasmi syarikat.
2. Awak isi maklumat asas dan pilih kaedah bayaran.
3. Syarikat akan proses penilaian (underwriting) untuk kelulusan.

Boleh saya hantarkan link permohonan tu sekarang?', 'Permudahkan proses penutupan kepada 3 langkah mudah supaya prospek nampak laluan pendaftaran yang jelas.', array['closing']::text[], 31),
(33, 'Closing: Dari Setuju ke Pendaftaran', 6, 'Dia setuju tapi tangguh isi borang', 'Hai {{Name}}, sempat buka link borang hari tu? 🙂

Kalau ada sangkut atau tak pasti kat mana-mana soalan, screenshot je dan hantar kat saya. Saya tolong guide satu persatu. Bila permohonan dah lengkap dihantar, baru pihak syarikat boleh mulakan semakan kelulusan.', 'Hilangkan rasa takut mengisi borang dengan menawarkan bantuan panduan skrin demi skrin.', array['closing']::text[], 32),
(34, 'Closing: Dari Setuju ke Pendaftaran', 6, 'Soalan kesihatan / medical history buat dia risau', 'Soalan kesihatan ni memang prosedur standard dalam permohonan takaful, {{Name}} 🙂

Paling penting, kita declare secara jujur dan lengkap. Kalau ada rekod rawatan lepas, bagitahu saya awal-awal. Saya tolong semakkan dokumen yang syarikat minta. Keputusan akhir tetap dengan underwriting.', 'Tenangkan prospek bahawa soalan perubatan adalah perkara biasa, dan terangkan faedah pengisytiharan jujur bagi mengelakkan masalah tuntutan.', array['closing']::text[], 33),
(35, 'Closing: Dari Setuju ke Pendaftaran', 6, 'Bayaran pertama gagal / transaksi sangkut', 'Hai {{Name}}, saya dapat notis transaksi bayaran pertama tadi tak lepas. Biasanya sebab had transaksi kad atau isu sekuriti bank je 🙂

Awak nak cuba buat transaksi sekali lagi, atau nak saya bantu tukar ke kaedah bayaran lain macam online banking?', 'Tangani kegagalan bayaran sebagai isu teknikal biasa tanpa membuatkan prospek rasa malu atau tertekan.', array['closing']::text[], 34),
(36, 'Closing: Dari Setuju ke Pendaftaran', 6, 'Polisi lulus: onboarding & bina hubungan jangka panjang', 'Tahniah {{Name}}, permohonan polisi takaful awak dah selamat diluluskan! 🎉

Tiga benda penting untuk awak semak:
1. Salinan e-polisi dan perincian manfaat coverage.
2. Tarikh polisi mula berkuat kuasa.
3. Syarat tempoh menunggu (*waiting period*) bagi penyakit tertentu.

Saya dah hantarkan salinan dokumen kat sini. Simpan nombor telefon saya sebagai `{{Agent}} - Takaful`. Kalau ada apa-apa kecemasan atau nak guna kad hospital, terus roger saya ya!', 'Berikan ucapan tahniah dan bimbing klien menyemak 3 perkara penting dalam e-polisi supaya tiada salah faham terma di kemudian hari.', array['closing']::text[], 35),
(37, 'Referral & Servis: Kekalkan Hubungan Baik', 7, 'Minta referral lepas claim berjaya (waktu paling sesuai)', 'Alhamdulillah {{Name}}, bayaran tuntutan dah selamat masuk ke akaun awak. Lega sangat rasa urusan dah selesai 🙂

Kalau awak rasa puas hati dengan servis dan bantuan saya sepanjang proses ni, dan kebetulan ada ahli keluarga atau kawan yang tengah cari info takaful, sudilah share nombor saya kat mereka ya. Biar mereka hubungi saya bila-bila masa.', 'Momen selepas tuntutan berjaya diselesaikan ialah waktu klien paling berpuas hati dan bersedia untuk mengesyorkan servis anda.', array['referral & servis']::text[], 36),
(38, 'Referral & Servis: Kekalkan Hubungan Baik', 7, 'Mesej pengenalan yang client boleh terus forward', '[Mesej untuk dipanjangkan kepada kenalan]

"Hai, ni nombor advisor takaful saya, {{Agent}}. Kalau awak tengah survey medical card atau nak semak balik polisi sedia ada, boleh terus WhatsApp dia kat [nombor telefon]. Saya dah berurusan dengan dia sebelum ni dan servis dia memang tiptop & telus."', 'Sediakan templat mesej yang ringkas dan santai supaya klien senang kongsikan kepada rakan mereka tanpa perlu mereka karang sendiri.', array['referral & servis']::text[], 37),
(39, 'Referral & Servis: Kekalkan Hubungan Baik', 7, 'Annual review: semakan servis tahunan', 'Hai {{Name}}, pejam celik dah genap setahun polisi awak aktif 🙂 Harap semuanya dalam keadaan baik!

Saya nak buat semakan pantas untuk pastikan pelan ni masih padan dengan situasi awak sekarang. Sepanjang tahun ni ada apa-apa perubahan besar tak? Contohnya: baru berkahwin, baru timang cahaya mata, tukar tempat kerja, atau baru beli rumah?', 'Tunjukkan khidmat lepas jualan yang konsisten setiap tahun dengan menyemak perubahan fasa hidup klien (kahwin, anak, kerjaya, rumah).', array['referral & servis']::text[], 38),
(40, 'Referral & Servis: Kekalkan Hubungan Baik', 7, 'Sentiasa kekal dalam ingatan client lama', 'Hai {{Name}}, saja nak share berita gembira: bulan ni saya sempat bantu [pencapaian sebenar, cth: bantu 3 keluarga baru buat pelan perlindungan kecemasan]. Kebanyakannya hasil daripada rekomendasi client-client saya sebelum ni 🙂

Kalau ada kawan-kawan atau saudara awak yang tengah cari info pasal takaful, jemputlah kongsikan nombor saya kat mereka ya.

Untuk polisi awak sendiri, kalau ada sebarang persoalan, bila-bila masa boleh terus WhatsApp saya macam biasa!', 'Kekalkan hubungan mesra secara berkala dengan berkongsi pencapaian aktiviti semasa dan mengingatkan servis sokongan yang sentiasa terbuka.', array['referral & servis']::text[], 39),
(41, 'Situasi Live: Scam, Ejen Lain, Group Family', 8, 'Prospek takut ejen WhatsApp ni scam', 'Faham sangat {{Name}}, sekarang memang ramai risau pasal isu scam 🙂 Elok sangat awak semak dulu kesahihan saya.

Tiga benda mudah awak boleh verify:
1. Saya advisor berlesen bawah [syarikat].
2. Saya boleh bagi nama penuh dan no. kod ejen rasmi untuk awak semak terus kat portal syarikat / LIAM / MTA.
3. Saya takkan sekali-kali minta OTP, password, atau suruh transfer duit ke akaun peribadi saya.

Kalau lepas semak awak masih rasa tak selesa, takpe sangat. Kita stop je kat sini, no problem.', 'Akui kebimbangan dia dulu, lepas tu bagi cara semak sendiri yang telus. Jangan paksa atau desak dia percaya.', array['situasi live']::text[], 40),
(42, 'Situasi Live: Scam, Ejen Lain, Group Family', 8, 'Ejen lain tengah follow-up / dah hantar quotation', 'Bagus {{Name}}, memang elok compare dulu 🙂 Saya tak berniat nak lawan atau kondem ejen tu.

Kalau awak sudi, forward je quotation dia. Tutup nama atau nombor peribadi dia kalau segan. Saya tolong semakkan dari segi manfaat, exclusion (apa yang tak cover), limit tahunan, dengan bayaran bulanan ikut dokumen hitam putih.

Lepas tu awak nilaikan sendiri. Keputusan tetap kat tangan awak, bukan saya.', 'Jangan lawan atau burukkan ejen lain. Tawarkan bantuan untuk banding dokumen fakta supaya keputusan kekal 100% kat tangan prospek.', array['situasi live']::text[], 41),
(43, 'Situasi Live: Scam, Ejen Lain, Group Family', 8, 'Dia nak cancel polisi lama sebelum yang baru lulus', '{{Name}}, tolong jangan cancel polisi lama lagi ya 🙂 Polisi baru ni belum tentu confirm approve atau aktif.

Kita tunggu permohonan baru ni lulus dulu, coverage dah mula jalan, dan company dah sahkan. Lepas semuanya selamat, baru kita tengok balik polisi lama tu. Kalau cancel awal, risau timbul gap kalau tiba-tiba jadi emergency masa tengah tunggu ni.', 'Jangan biar prospek cancel polisi sedia ada terburu-buru. Polisi baru belum tentu approved sehinggalah syarikat sahkan ia in force.', array['situasi live']::text[], 42),
(44, 'Situasi Live: Scam, Ejen Lain, Group Family', 8, 'Dia minta explain via voice note sebab malas baca panjang', 'Boleh je {{Name}} 🙂 Saya hantar voice note pendek dalam 1-2 minit ya biar senang awak dengar sambil buat kerja.

Nanti saya cover 3 benda je:
1. Apa yang dah okay.
2. Bahagian penting yang awak kena faham betul-betul.
3. Langkah seterusnya kalau nak proceed.

Lepas tu saya taipkan point ringkas sekali kat bawah, senang nak rujuk balik nanti.', 'Bagi voice note pendek yang tersusun, tapi sediakan juga ringkasan teks 3 baris kat bawah untuk rujukan pantas.', array['situasi live']::text[], 43),
(45, 'Situasi Live: Scam, Ejen Lain, Group Family', 8, 'Dia nak masukkan advisor ke group family / minta explain dalam group', 'Boleh {{Name}} 🙂 Tapi tak payah masukkan saya terus ke group dulu, risau family rasa kekok atau rimas. Lebih kemas kalau awak forward je mesej ringkas ni:

---
[Untuk group family]
"Hai semua, ni {{Agent}} dari [syarikat]. Dia tolong saya semak coverage family je secara santai, bukan nak paksa beli pun. Kalau ada apa-apa soalan pasal medical card atau polisi sedia ada, boleh terus WhatsApp dia kat [nombor]."
---

Kalau family memang selesa suruh saya join group untuk explain terus, bagitahu je ya.', 'Group family mudah bising dan buat orang rasa kekok. Sediakan mesej siap-forward supaya family boleh baca tanpa rasa advisor spam group mereka.', array['situasi live']::text[], 44),
(46, 'Situasi Live: Scam, Ejen Lain, Group Family', 8, '"Boleh kurang sikit?" (minta discount contribution)', 'Saya terus-terang je ya {{Name}} 🙂 Bayaran caruman ni fixed ikut sistem syarikat, dan undang-undang industri memang tak bagi ejen bagi diskaun atau rebate.

Tapi apa yang kita boleh adjust: saiz coverage, buang rider yang tak perlu, atau set ikut bajet bulanan awak.

Bagi tahu je range bajet yang awak selesa sebulan, saya susunkan balik pilihan ikut bajet tu. Kita guna illustration rasmi je.', 'Caruman takaful tak boleh direbat ikut undang-undang. Alihkan fokus perbualan ke pelarasan bajet dan rider guna dokumen rasmi.', array['situasi live']::text[], 45),
(47, 'Situasi Live: Scam, Ejen Lain, Group Family', 8, 'Hari jadi client sedia ada', 'Selamat hari lahir, {{Name}}! 🙂 Semoga dipanjangkan umur, dimurahkan rezeki, dan sentiasa sihat sekeluarga.

Polisi awak setakat ni semua okay dan running smooth. Kalau ada apa-apa nak tanya atau perlukan bantuan, macam biasa terus roger saya.

Kalau satu hari nanti nak buat quick review coverage pun boleh, santai-santai je bila awak lapang tanpa apa-apa komitmen.', 'Ucap dengan ikhlas dulu. Tawaran review cuma pilihan santai, bukan guna taktik takut-takutkan pasal umur naik.', array['situasi live']::text[], 46),
(48, 'Situasi Live: Scam, Ejen Lain, Group Family', 8, 'Client tengah proses claim, nak check-in tanpa janji lulus', 'Hai {{Name}}, saya nak check-in sikit pasal status claim yang kita submit hari tu 🙂

Ada dapat apa-apa update dari syarikat atau hospital minta dokumen tambahan? Kalau ada surat atau mesej, forward kat saya.

Keputusan akhir ikut semakan claim syarikat. Saya tolong pantau proses dan dokumen dari sini, bukan jamin lulus.', 'Susulan waktu proses claim membuktikan servis. Jangan jamin kelulusan; bantu urusan dokumen dan semak status sahaja.', array['situasi live']::text[], 47),
(49, 'Situasi Live: Scam, Ejen Lain, Group Family', 8, 'Client atau prospek baru resign, risau medical card company', 'Tahniah dan all the best untuk kerja baru, {{Name}} 🙂

Bila resign, medical card company kadang-kadang tamat atau berubah. Awak nak saya tolong semakkan apa yang masih cover, dan bahagian mana yang bergantung pada status kerja?

Hantar je nama pelan atau screenshot manfaat kalau ada, saya tengokkan.', 'Group cover majikan kadang-kadang tamat atau berubah bila resign. Bantu semak dokumen secara tenang, jangan scare-sell.', array['situasi live']::text[], 48),
(50, 'Situasi Live: Scam, Ejen Lain, Group Family', 8, 'Orang reply status WhatsApp advisor', 'Hai {{Name}}, thanks reply status tadi 🙂

Biasanya bila saya share info macam ni, ada yang saja nak tahu atau tengah fikir nak semak balik pelan sendiri. Awak tengah survey-survey ke, atau ada soalan spesifik yang nak saya tolong jawabkan?', 'Reply status ialah pintu kecil. Kenal pasti niat dia dulu, jangan terus dump produk sebaris.', array['situasi live']::text[], 49),
(51, 'Objection: "Tak Percaya / Banding / Family Kata Tak Payah"', 9, 'Dah kecewa dengan ejen lama, susah nak percaya', 'Minta maaf dengar pasal pengalaman lepas tu {{Name}} 🙂 Memang wajar sangat awak rasa skeptikal dan berhati-hati sekarang.

Saya tak minta awak percaya janji manis saya terus. Kita semak dokumen rasmi hitam putih je: illustration, jadual manfaat, dengan syarat exclusion. Awak boleh semak no. kod ejen saya dulu.

Kalau pada mana-mana step awak rasa tak selesa, bagitahu je, kita boleh stop terus.', 'Jangan paksa prospek percaya bulat-bulat. Alihkan kepercayaan pada dokumen hitam putih dan hak dia untuk stop bila-bila masa.', array['objection · tak percaya / banding / family kata tak payah']::text[], 50),
(52, 'Objection: "Tak Percaya / Banding / Family Kata Tak Payah"', 9, 'Nak banding 3-5 syarikat dulu', 'Cantik, memang elok compare dulu {{Name}} 🙂 Saya sokong sangat.

Bila awak dah dapat 2-3 quotation tu, forward kat saya. Kita compare 4 benda: manfaat, exclusion (apa yang tak cover), annual limit, dengan bayaran sebulan.

Saya tolong ''terjemahkan'' bagi mudah faham. Tapi nak pilih yang mana, keputusan tetap 100% kat tangan awak.', 'Raikan langkah dia nak survey. Jadi orang yang bantu dia faham isi quotation, bukan orang yang mendesak.', array['objection · tak percaya / banding / family kata tak payah']::text[], 51),
(53, 'Objection: "Tak Percaya / Banding / Family Kata Tak Payah"', 9, 'Taknak bind lama / takut commit 20 tahun', 'Faham sangat {{Name}}, tengok komitmen 20-30 tahun memang rasa berat 🙂

Sebenarnya pelan perlindungan ada macam-macam jenis. Ada yang fleksibel, ada pelan bertempoh, ada yang jangka panjang. Saya tunjuk pilihan ikut illustration rasmi, sekali dengan apa jadi kalau nak stop tengah jalan.

Awak tengok dulu macam mana rupa dia, bukan kena terus sign hari ni.', 'Jelaskan tempoh bergantung pada jenis pelan. Tunjuk illustration rasmi dan kesan berhenti awal tanpa janji manis exit percuma.', array['objection · tak percaya / banding / family kata tak payah']::text[], 52),
(54, 'Objection: "Tak Percaya / Banding / Family Kata Tak Payah"', 9, 'Taknak medical check / takut blood test', 'Faham sangat {{Name}}, ramai yang seram bila sebut pasal jumpa doktor atau cucuk darah ni 🙂

Tapi sebenarnya tak semua pelan atau umur wajib pergi checkup. Dia bergantung pada sejarah kesihatan dengan jumlah coverage yang kita apply. Saya semak dulu syarat untuk kes awak.

Yang paling penting kita declare jujur je dalam borang, keputusan akhir biar pihak syarikat yang tentukan.', 'Jangan anggap semua pelan wajib checkup. Semak syarat underwriting dulu dan tekankan kepentingan declare secara jujur.', array['objection · tak percaya / banding / family kata tak payah']::text[], 53),
(55, 'Objection: "Tak Percaya / Banding / Family Kata Tak Payah"', 9, 'Dulu rejected / ada medical history, takut apply sia-sia', 'Thanks sebab share awal-awal {{Name}} 🙂 Pernah kena reject dulu tak bermakna semua peluang tertutup terus.

Saya tak boleh nak janji bulan dan bintang yang kali ni confirm lulus. Cuma apa yang saya boleh tolong: kita kumpul dokumen medikal yang ada, isi secara telus, dan submit pada underwriting syarikat.

Nak cuba share dulu tak apa isu atau sakit yang pernah sangkut sebelum ni?', 'Jangan jamin kelulusan. Minta sejarah kesihatan secara berhemah dan terangkan underwriter yang buat keputusan.', array['objection · tak percaya / banding / family kata tak payah']::text[], 54),
(56, 'Objection: "Tak Percaya / Banding / Family Kata Tak Payah"', 9, 'Mak, ayah atau family kata tak payah insurance', 'Faham {{Name}}, orang tua atau family biasanya cakap macam tu sebab risau kita terbeban duit, atau belum nampak fungsi dia 🙂

Tak payah bertekak dengan mereka. Kalau nak, saya buatkan ringkasan 1 page yang simple untuk awak tunjuk kat family: apa yang cover, berapa sebulan, dan apa yang tak cover.

Biar mereka baca faktanya. Kalau mereka nak tanya terus kat saya pun boleh, kita buat call santai bertiga.', 'Jangan suruh prospek berbalah dengan keluarga. Sediakan ringkasan santai berasaskan fakta untuk dibawa berbincang di rumah.', array['objection · tak percaya / banding / family kata tak payah']::text[], 55),
(57, 'Objection: "Tak Percaya / Banding / Family Kata Tak Payah"', 9, 'Taknak auto debit / takut duit kena potong senyap', 'Faham sangat {{Name}}, bab duit tolak automatik ni memang kena berhati-hati 🙂

Kaedah bayar ikut apa yang syarikat sediakan. Ada option potongan kad debit/kredit, online banking manual, atau auto debit.

Saya explain semua cara yang ada, nanti awak pilih mana yang paling tenang untuk cashflow awak. Tarikh dengan amaun semua ada dalam dokumen sebelum awak sign agree.', 'Hormati kawalan kewangan prospek. Semak pilihan pembayaran yang sah dan pastikan amaun serta tarikh jelas sebelum setuju.', array['objection · tak percaya / banding / family kata tak payah']::text[], 56),
(58, 'Objection: "Tak Percaya / Banding / Family Kata Tak Payah"', 9, '"Duit simpan sendiri lagi untung"', 'Betul, simpan duit sendiri memang wajib ada {{Name}} 🙂 Takaful bukan nak lawan atau ganti simpanan awak.

Beza dia satu je: simpanan peribadi ambil masa nak kumpul, tapi bila kena bil hospital puluh ribu, sekelip mata boleh susut. Takaful ni macam payung untuk elak duit simpanan tu lesap bila musibah datang mengejut.

Kalau awak nak, saya tunjuk illustration macam mana pelan ni backup simpanan awak tu. Kita tengok sama-sama ada gap ke tak.', 'Jangan nafikan kebaikan simpanan tunai. Bezakan fungsi simpanan dengan fungsi pindahan risiko (risk transfer).', array['objection · tak percaya / banding / family kata tak payah']::text[], 57),
(59, 'Objection: "Tak Percaya / Banding / Family Kata Tak Payah"', 9, 'Single, takde tanggungan, rasa tak perlu', 'Betul {{Name}}, bila belum ada komitmen anak bini, keutamaan memang berbeza 🙂

Untuk yang bujang, kita bukan fokus pampasan mati, tapi lebih kepada medical card dan backup income kalau jatuh sakit atau hilang upaya. Tujuannya supaya kalau masuk wad, takde la sampai bebankan mak ayah atau habiskan duit simpanan sendiri.

Saya tunjukkan pelan medical asas yang muat bajet bujang, kita buang rider yang tak perlu.', 'Akui fasa hidup orang bujang. Fokus pada bil rawatan hospital dan simpanan peribadi tanpa paksa pampasan kematian yang tak relevan.', array['objection · tak percaya / banding / family kata tak payah']::text[], 58),
(60, 'Objection: "Tak Percaya / Banding / Family Kata Tak Payah"', 9, '"Claim susah, kawan cerita hospital reject"', 'Cerita macam tu memang buat orang serik {{Name}} 🙂 Saya tak nafikan, kes claim kena tolak memang ada jadi kat luar sana.

Biasanya reject ni sebab ada rekod sakit lama yang tak declare, atau kena penyakit dalam waiting period. Sebab tu tugas saya bukan setakat tolong apply, tapi pastikan borang diisi betul dan tolong susun dokumen masa claim.

Sebelum awak decide apa-apa, jom kita semak terus senarai exclusion pelan ni supaya jelas apa yang cover dan apa yang tak.', 'Validasi pengalaman negatif yang dia dengar. Terangkan peranan ejen untuk urus dokumen dan semak punca biasa claim sangkut.', array['objection · tak percaya / banding / family kata tak payah']::text[], 59),
(61, 'Objection: "MRTA / Income Tak Tetap / Caruman Naik"', 10, '"Nanti bila kahwin / ada anak dulu"', 'Faham {{Name}}, memang logik nak plan betul-betul bila dah ada family nanti 🙂

Cuma ada 2 benda yang tak tunggu kita kahwin: bil rawatan hospital kalau sakit, dengan gaji terhenti kalau cuti sakit lama. Umur dengan rekod kesihatan masa apply boleh affect underwriting. Syarikat yang decide.

Cadangan saya: kita tengok pelan asas untuk diri sendiri dulu ikut bajet sekarang, guna illustration rasmi. Dah kahwin nanti, baru kita review tambah pelan untuk waris.', 'Hormati timing dia. Bawa fokus kepada kos rawatan diri dan kelayakan kesihatan semasa bujang, bukan jual ketakutan pasal mati.', array['objection · mrta / income tak tetap / caruman naik']::text[], 60),
(62, 'Objection: "MRTA / Income Tak Tetap / Caruman Naik"', 10, '"Dah ada MRTA/MRTT bank, cukup dah"', 'Bagus dah tu ada MRTA/MRTT {{Name}} 🙂 Sekurang-kurangnya bab hutang rumah dah selamat.

Cuma satu kena jelas: pampasan MRTA/MRTT tu pergi terus kat bank untuk langsaikan baki hutang rumah. Ahli keluarga tak dapat tunai tu untuk buat belanja dapur, yuran anak, atau tampung kos kalau sakit kritikal.

Kalau awak sudi, share jadual pinjaman tu. Saya tolong tengokkan sama ada ada gap kat bahagian belanja sara hidup family.', 'Akui kebaikan MRTA/MRTT untuk cover hutang rumah. Bezakan fungsinya dengan keperluan tunai sara hidup keluarga.', array['objection · mrta / income tak tetap / caruman naik']::text[], 61),
(63, 'Objection: "MRTA / Income Tak Tetap / Caruman Naik"', 10, '"EPF / SOCSO / KWSP dah cover"', 'Betul, KWSP dengan SOCSO memang ada manfaat dia, bukan kosong {{Name}} 🙂

Cuma beza fungsi dia: SOCSO cover kalau kemalangan masa kerja atau keilatan tertentu, KWSP pulak sebenarnya korek duit simpanan hari tua awak sendiri.

Nak saya buatkan perbandingan ringkas? Apa yang SOCSO/KWSP dah cover, dan bahagian mana yang perlukan backup sendiri. Kita tengok dokumen sama-sama.', 'Jangan perkecilkan skim keselamatan pekerja. Bandingkan fungsi dan cara pengeluaran dana secara objektif.', array['objection · mrta / income tak tetap / caruman naik']::text[], 62),
(64, 'Objection: "MRTA / Income Tak Tetap / Caruman Naik"', 10, 'Income tak tetap / komisen, takut gagal bayar', 'Faham sangat {{Name}}, buat bisnes atau sales komisen ni memang income ada pasang surut 🙂 Komitmen bulanan kena muat bajet bulan paling lemau, bukan bulan yang tengah lebat je.

Bagi tahu saya berapa bajet bulanan yang langsung tak rasa semput walaupun jualan slow? Kita cari pelan asas dalam bajet tu dulu, ikut illustration rasmi.

Start kecil dulu. Belum jadi polisi sampai application dan underwriting syarikat selesai. Income dah makin stabil, baru kita review nak top-up ke tak.', 'Fahami realiti income yang naik turun. Rangka bajet caruman berdasarkan waktu jualan paling perlahan.', array['objection · mrta / income tak tetap / caruman naik']::text[], 63),
(65, 'Objection: "MRTA / Income Tak Tetap / Caruman Naik"', 10, 'Taknak bagi IC / takut data bocor', 'Faham sangat {{Name}}, sekarang ni bab IC memang wajib jaga betul-betul 🙂

Untuk sesi sembang atau sediakan quotation awal ni, saya tak perlukan IC awak langsung. Cuma perlukan tarikh lahir dan pekerjaan je untuk buat kiraan bajet.

Gambar IC cuma diperlukan bila awak sendiri dah bersetuju nak submit permohonan melalui sistem rasmi syarikat nanti. Saya takkan minta OTP, password, atau minta gambar pelik-pelik kat WhatsApp.', 'Jelaskan bila IC diperlukan secara rasmi. Beri jaminan keselamatan data dan jangan mendesak.', array['objection · mrta / income tak tetap / caruman naik']::text[], 64),
(66, 'Objection: "MRTA / Income Tak Tetap / Caruman Naik"', 10, '"Takaful ni insurance juga, haram ke?"', 'Soalan yang bagus sangat {{Name}} 🙂 Saya advisor dan bukan ustaz, jadi saya tak berani nak keluarkan hukum dari mulut sendiri.

Yang boleh: saya hantar nama syarikat, jenis plan, dan dokumen rasmi termasuk sijil atau pengesahan syariah kalau syarikat ada. Awak semak dengan ustaz atau sumber yang awak percaya.

Kalau lepas tu masih tak selesa, kita tak force.', 'Advisor bukan ustaz. Hantar dokumen rasmi syarikat; biar prospek semak dengan sumber yang dia percaya.', array['objection · mrta / income tak tetap / caruman naik']::text[], 65),
(67, 'Objection: "MRTA / Income Tak Tetap / Caruman Naik"', 10, '"Investment-linked kawan rugi, taknak"', 'Dengar cerita kawan rugi macam tu memang buat serik {{Name}} 🙂 Saya akui ramai yang salah faham pasal pelan investment-linked (ILP) ni.

ILP ni bukan skim pelaburan untuk buat untung cepat. Duit pelaburan sikit tu tujuannya untuk tolong cover kos takaful bila umur meningkat nanti. Kawan yang rugi tu biasanya sebab expectation ingat macam skim saham.

Kalau awak nak fokus pure protection je, fokus bil hospital tanpa pening kepala pasal turun naik saham, saya boleh tunjuk pilihan pelan tradisional. Awak pilih mana yang tenang di hati.', 'Akui kekecewaan dia pasal ILP. Asingkan fungsi perlindungan sebenar dengan turun naik dana pelaburan.', array['objection · mrta / income tak tetap / caruman naik']::text[], 66),
(68, 'Objection: "MRTA / Income Tak Tetap / Caruman Naik"', 10, '"Contribution naik setiap tahun, takut"', 'Risau pasal bayaran caruman naik ni memang valid {{Name}} 🙂 Saya pun takkan bagi janji manis cakap harga lock takkan berubah sampai bila-bila.

Hakikatnya, kos rawatan hospital makin mahal, jadi syarikat memang ada hak buat semakan caruman (repricing) bila perlu. Tapi ada pelan yang ikut umur, dan ada pelan yang carumannya dirangka lebih stabil.

Jom kita buka jadual illustration rasmi syarikat, tengok jadual unjuran caruman dia. Awak tengok angka sebenar dulu, kalau tak berkenan jangan sign.', 'Jelaskan isu inflasi perubatan dan semakan caruman secara telus berdasarkan jadual illustration rasmi.', array['objection · mrta / income tak tetap / caruman naik']::text[], 67),
(69, 'Objection: "MRTA / Income Tak Tetap / Caruman Naik"', 10, '"Spouse dah cover family, I rider je"', 'Alhamdulillah, untung pasangan dah tolong sediakan pelan family {{Name}} 🙂

Cuma sebelum decide tak perlu ada pelan peribadi, elok kita semak 2 benda ni dulu:
1. Limit tahunan tu kongsi sekeluarga (sharing limit) ke, atau setiap orang ada limit sendiri?
2. Kalau apa-apa jadi kat pasangan (cth: tukar kerja, hilang upaya, atau cerai), apa jadi pada status polisi awak?

Kalau lepas semak memang dah cukup dan selamat, saya cakap cukup. Tapi kalau ada gap, baru kita bincang.', 'Semak had perlindungan dan hak penama tanpa mendesak prospek ambil pelan bertindih.', array['objection · mrta / income tak tetap / caruman naik']::text[], 68),
(70, 'Objection: "MRTA / Income Tak Tetap / Caruman Naik"', 10, '"Dah apply syarikat lain, pending"', 'Thanks sebab bagitahu awal {{Name}} 🙂 Kalau permohonan kat sana tengah pending, nasihat saya tunggu dulu keputusan di sana sampai selesai. Jangan apply dua-dua tempat serentak senyap-senyap, nanti underwriter pening dan sangkut dua-dua belah.

Tunggu sana keluar result dulu. Kalau dah approved elok, alhamdulillah. Kalau ada apa-apa masalah atau syarat yang awak rasa tak puas hati, waktu tu roger saya balik untuk kita tengok pilihan lain.', 'Jangan suruh cancel yang pending atau apply dua tempat senyap-senyap. Kekalkan etika industri yang bersih.', array['objection · mrta / income tak tetap / caruman naik']::text[], 69),
(71, 'Alat Kerja: Plan 7 Hari & Senarai Pantang Larang', 11, 'Plan 7 hari susulan prospek berminat', '[Nota kerja · Plan 7 hari selepas prospek berminat]

Hari 0: Ucap terima kasih, confirm balik apa yang dia nak semak, send 4 soalan pra-call ringkas.
Hari 1: Hantar illustration rasmi atau confirmkan slot call. Elakkan hantar banyak-banyak PDF serentak.
Hari 2: Reminder santai kalau dia senyap. Bawa 1 point baru atau fakta ringkas, jangan sekadar tanya "macam mana?".
Hari 3-4: Handle objection. Kalau dia nak fikir dulu, pecahkan soalan (bajet, jenis plan, atau nak bincang pasangan).
Hari 5: Hantar ringkasan 1 muka surat + bagi satu next step yang jelas.
Hari 6-7: Last check-in secara sopan, lepas tu park dulu. Jangan spam.

*Nota: Kalau prospek reply kat mana-mana hari, stop flow auto dan borak secara natural ikut rentak dia.*', 'Susulan berjadual ada langkah konkrit setiap hari, bukan sekadar hantar teks kosong "macam mana?".', array['alat kerja']::text[], 70),
(72, 'Alat Kerja: Plan 7 Hari & Senarai Pantang Larang', 11, 'Soalan pra-call sebelum appointment', '{{Name}}, sebelum kita call nanti, ada 4 soalan ringkas je 🙂 Balas santai atau pendek-pendek pun takpe:

1. Siapa yang nak dilindungi? (Diri sendiri / pasangan / anak)
2. Sekarang ni ada mana-mana polisi peribadi atau medical card company tak?
3. Bajet bulanan yang rasa selesa dan tak membebankan sekitar berapa?
4. Ada apa-apa sejarah sakit, pembedahan, atau rawatan hospital yang saya patut tahu awal?

(Kalau segan nak share bab kesihatan kat WhatsApp ni, kita borak masa call nanti pun okay).', 'Empat soalan ni buat sesi terus ke point penting dan jimatkan masa prospek.', array['alat kerja']::text[], 71),
(73, 'Alat Kerja: Plan 7 Hari & Senarai Pantang Larang', 11, 'Ringkasan untuk pasangan (siap forward)', '[Mesej untuk forward pada suami/isteri]

Hai, ni ringkasan dari advisor {{Agent}} pasal pelan takaful yang kita bincangkan untuk family:

• Bayaran: Anggaran RM[jumlah] sebulan (ikut illustration rasmi)
• Manfaat utama: [nyatakan 2-3 manfaat utama, cth: Medical card cover RM1 juta / Pampasan sakit kritikal]
• Kenapa cadang: [sebab utama, cth: Backup gaji kalau ketua keluarga jatuh sakit]
• Yang kena tahu: [syarat penting atau tempoh menunggu]

Bukan nak kena sign tergesa-gesa hari ni. Kalau ada apa-apa soalan, boleh reply kat saya atau kita call bertiga dengan advisor dalam 10 minit.', 'Pasangan yang tak join perbualan perlukan fakta yang ringkas dan tepat tanpa istilah teknikal yang pening.', array['alat kerja']::text[], 72),
(74, 'Alat Kerja: Plan 7 Hari & Senarai Pantang Larang', 11, 'Label pipeline WhatsApp Business', '[Nota kerja · Label WhatsApp Business]

1. Baru: First reply, belum semak keperluan.
2. Tunggu quotation: Tunggu dokumen atau tengah sediakan illustration.
3. Set Appointment: Dah lock masa untuk call/jumpa.
4. Nak fikir: Objection tengah timbul, follow-up berjadual secara soft.
5. Underwriting: Permohonan dah hantar, tunggu keputusan kelulusan syarikat.
6. Aktif: Polisi dah in force, servis berkala.
7. Claim: Tengah bantu urus tuntutan/hospital.
8. Park: Follow-up ditutup secara baik, simpan contact & kekal silaturahim.

*Disiplin: 1 contact hanya guna 1 label utama. Review setiap hari Jumaat.*', 'Label yang konsisten elakkan prospek tercicir atau orang yang dah tolak terus-menerus dikejar.', array['alat kerja']::text[], 73),
(75, 'Alat Kerja: Plan 7 Hari & Senarai Pantang Larang', 11, 'Recap 24 jam selepas call', 'Hai {{Name}}, thanks luangkan masa untuk call tadi ya 🙂 Ni ringkasan apa yang kita bincang:

• Yang dah clear: [point 1], [point 2].
• Yang masih open / nak confirm: [soalan tertunggak].
• Next step: [tindakan seterusnya], sebelum [hari/masa].

Quotation yang saya bagi tu adalah illustration anggaran rasmi, dan perlindungan cuma aktif lepas permohonan diluluskan oleh underwriter syarikat.

Kalau ada info yang saya tertinggal, roger je kat sini ya.', 'Rekod bertulis kurangkan salah faham lisan dan pastikan prospek jelas sebelum proceed.', array['alat kerja']::text[], 74),
(76, 'Alat Kerja: Plan 7 Hari & Senarai Pantang Larang', 11, 'Senarai jangan cakap (untuk advisor)', '[Nota kerja · Senarai pantang larang untuk advisor]

JANGAN cakap: "Claim confirm 100% lulus."
→ Ganti dengan: "Kelulusan claim tertakluk pada dokumen dan syarat polisi."

JANGAN cakap: "Harga ni lock sampai bila-bila, takkan naik."
→ Ganti dengan: "Ikut jadual illustration rasmi dan tertakluk pada semakan syarikat."

JANGAN cakap: "Cancel je polisi lama tu, ambik pelan saya."
→ Ganti dengan: "Kekalkan polisi lama sampai pelan baru sah lulus dan aktif."

JANGAN cakap: "Semua penyakit hospital cover, unlimited."
→ Ganti dengan: "Ada limit tahunan dan senarai exclusion dalam dokumen polisi."

JANGAN cakap: "Ejen lama tu menipu / pelan syarikat sana teruk."
→ Ganti dengan: "Kita fokus semak dokumen dan keperluan semasa awak."

JANGAN cakap: "Saya boleh bagi diskaun / potong komisen."
→ Peringatan: Sebarang bentuk rebate caruman adalah salah di sisi undang-undang.

JANGAN cakap: "Penyakit lama takyah declare, lepas 2 tahun selamat."
→ Peringatan: Tak declare rekod medikal boleh buat tuntutan kena reject dan polisi batal serta-merta.

JANGAN cakap: "Transfer duit caruman ke akaun personal saya dulu."
→ Peringatan: Semua bayaran wajib masuk terus ke akaun rasmi syarikat pengendali takaful.', 'Ayat nampak sedap untuk closing, tapi paling kerap bawa masalah aduan, saman, atau isu compliance.', array['alat kerja']::text[], 75)
on conflict (script_no) do update set
  chapter = excluded.chapter,
  chapter_order = excluded.chapter_order,
  situation = excluded.situation,
  body = excluded.body,
  why = excluded.why,
  tags = excluded.tags,
  sort_order = excluded.sort_order;
