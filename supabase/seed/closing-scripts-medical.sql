-- Seeded from the agency's medical script library. Re-runnable: a
-- re-seed updates the wording in place for this script_set rather than
-- duplicating, so a SuperAdmin's later edits are the ones at risk, never
-- the row identity.
insert into takaful_scripts (script_set, script_no, chapter, chapter_order, situation, body, why, tags, sort_order)
values
('medical', 1, 'Semak Cover Yang Dah Ada Dulu', 0, 'Prospek kata company dah bagi medical card', 'Alhamdulillah {{Name}}, kalau company sediakan kad memang jimat banyak 🙂

Boleh saya tolong tengokkan ringkas manfaat pelan tu? Saja nak semak limit tahunan, cover diri sendiri je ke atau family sekali, dengan apa jadi kalau awak bertukar kerja nanti.

Lepas kita semak, baru nampak jelas sama ada dah cukup selamat atau ada bahagian penting yang awak kena alert.', 'Hargai manfaat sedia ada daripada majikan, lepas tu ajak semak terma yang selalu berubah bila status kerja bertukar. Nada ni bukan nak paksa dia beli pelan baru serta-merta.', array['semak cover yang dah ada dulu']::text[], 0),
('medical', 2, 'Semak Cover Yang Dah Ada Dulu', 0, 'Prospek bergantung pada GL kerajaan atau majikan', 'Kemudahan GL tu memang sangat melegakan bila ada kecemasan, {{Name}} 🙂

Cuma biasanya kalau anak atau pasangan demam teruk tengah-tengah malam, hospital mana yang awak paling selesa bawa? Saya boleh tolong semak macam mana pelan GL awak tu berfungsi dari segi pilihan panel dan had limit dia.

Bukan suruh tukar pun, kita semak santai-santai je dulu.', 'Jangan anggap semua kemudahan GL itu sama rata. Soalan ni bawa perbualan kepada keselesaan rawatan keluarga dan pilihan hospital kecemasan yang berdekatan.', array['semak cover yang dah ada dulu']::text[], 1),
('medical', 3, 'Semak Cover Yang Dah Ada Dulu', 0, 'Dia kata sihat lagi, tak perlu fikir medical card', 'Betul {{Name}}, waktu tengah sihat walafiat ni memang kita rasa benda ni belum urgent 🙂

Cuma hakikat medical card ni, kita kena apply sebelum ada rekod sakit. Bila dah timbul sejarah kesihatan nanti, underwriter syarikat akan mula letak syarat ketat atau terus reject.

Saya boleh tunjukkan jadual rasmi untuk umur sekarang supaya awak nampak pilihan yang ada. Tengok dulu pun tak rugi apa-apa.', 'Terangkan masa terbaik untuk memohon tanpa taktik menakut-nakutkan (*scare-selling*) atau memberi jaminan kelulusan palsu. Keputusan penajajaminan (*underwriting*) tetap ikut syarat syarikat.', array['semak cover yang dah ada dulu']::text[], 2),
('medical', 4, 'Semak Cover Yang Dah Ada Dulu', 0, 'Prospek baru balik dari hospital atau dengar cerita kawan masuk wad', 'Harap semuanya dah kembali okay dan stabil ya, {{Name}} 🙂

Bila dengar pengalaman orang terdekat masuk wad, memang auto buat kita terfikir pasal persediaan kad perubatan sendiri. Kalau awak dah ada pelan sekarang, hantar je nama pelan atau screenshot ringkasan manfaat.

Saya tolong ''terjemahkan'' limit tahunan, panel hospital, dan syarat penting dia dalam bahasa yang mudah faham.', 'Manfaatkan situasi yang dia sendiri bangkitkan untuk buka ruang semakan, bukan mengambil kesempatan menjual semasa dia tengah runsing. Fokus kepada memahami pelan sedia ada.', array['semak cover yang dah ada dulu']::text[], 3),
('medical', 5, 'Bila Bajet dan Manfaat Jadi Soalan', 1, 'Prospek kata caruman bulanan rasa mahal', 'Faham sangat {{Name}}, komitmen bulanan memang kena masuk akal dan tak boleh bebankan belanja dapur 🙂

Cuba kongsi berapa range bajet sebulan yang betul-betul selesa untuk poket awak? Saya akan semak pilihan yang ada ikut julat tu guna dokumen sebut harga rasmi. Kalau rasa tak padan, kita tak proceed pun takpe.', 'Bezakan antara isu kekangan bajet dengan isu kefahaman nilai pelan. Bila prospek beri julat bajet yang selesa, perbualan akan jadi lebih telus dan tiada paksaan.', array['bila bajet dan manfaat jadi soalan']::text[], 4),
('medical', 6, 'Bila Bajet dan Manfaat Jadi Soalan', 1, 'Prospek nampak istilah "as charged" dalam quotation', '{{Name}}, ayat ''as charged'' tu memang nampak sedap dibaca kat kertas sebut harga kan 🙂

Tapi kita kena tengok sekali annual limit, had kelayakan bilik sehari, dan senarai pengecualian (exclusion). Saya boleh tolong highlight terus kat dokumen rasmi bahagian mana yang penting, supaya awak tak buat andaian ikut satu frasa tu je.', 'Istilah *as charged* selalu disalahertikan sebagai perlindungan 100% tanpa had. Ajak dia semak had tahunan dan klausa pengecualian bersama supaya jangkaan dia realistik.', array['bila bajet dan manfaat jadi soalan']::text[], 5),
('medical', 7, 'Bila Bajet dan Manfaat Jadi Soalan', 1, 'Prospek tanya co-takaful atau deductible sebab takut kena tambah duit', 'Soalan yang bagus sangat {{Name}} 🙂

Co-takaful atau deductible ni maksudnya ada sebahagian kos rawatan yang peserta kena bayar sendiri ikut terma pelan. Saya semak dokumen pelan yang awak tengah tengok tu, lepas tu saya buatkan contoh kiraan mudah jika dimasukkan ke wad. Baru awak boleh buat penilaian dengan tenang.', 'Jawab secara terus terang berserta contoh kiraan berasaskan pelan. Jangan nafikan kebimbangan dia atau berjanji semua kos akan ditanggung sepenuhnya.', array['bila bajet dan manfaat jadi soalan']::text[], 6),
('medical', 8, 'Bila Bajet dan Manfaat Jadi Soalan', 1, 'Prospek tanya hospital panel dekat kawasan rumah', 'Boleh sangat {{Name}} 🙂 Area [kawasan rumah] tu, hospital swasta mana yang paling dekat atau yang awak sekeluarga biasa pergi?

Bagi tahu saya nama hospital tu, biar saya semak senarai panel rasmi syarikat yang terkini. Kita sahkan dulu kat portal rasmi supaya maklumat tu tepat, sebab senarai panel ni boleh dikemas kini dari semasa ke semasa.', 'Senarai hospital panel boleh berubah dari semasa ke semasa mengikut perjanjian pengendali takaful. Jangan jawab daripada ingatan; minta lokasi dan semak portal rasmi dahulu.', array['bila bajet dan manfaat jadi soalan']::text[], 7),
('medical', 9, 'Bantu Dia Buat Keputusan Dengan Tenang', 2, 'Prospek ada sejarah rawatan dan takut tak boleh mohon', 'Terima kasih sebab berterus-terang awal, {{Name}} 🙂

Bila ada sejarah rawatan sebelum ni, kuncinya kita isi borang dengan jujur dan lengkap. Saya boleh tolong semak dokumen atau laporan perubatan apa yang biasanya underwriter perlukan, tapi keputusan akhir tetap tertakluk pada pihak syarikat.

Awak nak saya bantu pandukan satu-satu?', 'Jangan ambil alih peranan penaja jamin syarikat. Minta maklumat asas secara berhemah dan tekankan bahawa pengisytiharan jujur membantu proses semakan yang sah.', array['bantu dia buat keputusan dengan tenang']::text[], 8),
('medical', 10, 'Bantu Dia Buat Keputusan Dengan Tenang', 2, 'Dia compare dua quotation yang nampak hampir sama', 'Bila tengok sepintas lalu memang nampak lebih kurang je {{Name}} 🙂 Meh kita bandingkan 4 perkara utama ni dulu:

1. Annual limit (had tahunan)
2. Room & board (had kelayakan bilik)
3. Syarat co-takaful / deductible
4. Senarai hospital panel

Forward dua-dua dokumen sebut harga tu, saya buatkan ringkasan perbezaannya secara objektif tanpa hard sell.', 'Sediakan kerangka perbandingan yang objektif tanpa mendesak prospek memilih pelan yang mahal. Ini bantu prospek menilai manfaat dan had secara adil.', array['bantu dia buat keputusan dengan tenang']::text[], 9),
('medical', 11, 'Bantu Dia Buat Keputusan Dengan Tenang', 2, 'Follow up selepas hantar illustration rasmi, dia seen sahaja', 'Hai {{Name}}, sempat buka tengok jadual sebut harga hari tu? 🙂

Kalau ada satu bahagian yang rasa macam kurang jelas, pilih je mana-mana: had tahunan, bayaran bulanan, panel hospital, atau syarat kelayakan. Saya tolong terangkan seringkas mungkin kat sini.', 'Susulan perlukan pintu masuk yang rendah rintangan (*low barrier*). Bertanya satu kebimbangan spesifik jauh lebih mudah dijawab berbanding mendesak jawapan "ya atau tidak".', array['bantu dia buat keputusan dengan tenang']::text[], 10),
('medical', 12, 'Bantu Dia Buat Keputusan Dengan Tenang', 2, 'Prospek belum bersedia dan awak mahu tutup perbualan dengan baik', 'Takpe sangat {{Name}}, ambil masa dulu untuk pertimbangkan ya 🙂

Saya ''park'' dulu semakan ni supaya tak ganggu masa awak. Nanti bila-bila awak dah rasa bersedia nak teliti semula, WhatsApp je saya balik. Saya akan semak semula sebut harga terkini ikut waktu tu.', 'Menutup perbualan tanpa desakan mengekalkan kepercayaan jangka panjang dan mengelakkan rasa meluat akibat urgensi palsu.', array['bantu dia buat keputusan dengan tenang']::text[], 11),
('medical', 13, 'Objection: "Waiting Period / Panel / Maternity / Limit"', 3, '"Waiting period panjang, takut tak cover"', 'Faham sangat {{Name}}, bab tempoh menunggu (waiting period) ni memang buat ramai yang risau 🙂 Saya cakap terus terang, tiada pelan yang cover semua benda serta-merta pada hari pertama.

Yang kita boleh buat: kita buka jadual rasmi dan tengok tempoh bertenang untuk [jenis manfaat, cth: kemalangan, sakit biasa, atau penyakit khusus].

Awak nampak syarat bertulis tu dengan jelas dulu sebelum buat apa-apa keputusan. Bukan suruh percaya kata-kata saya semata-mata.', 'Tempoh bertenang (*waiting period*) termaktub dalam kontrak bertulis dan tidak boleh dihapuskan oleh ejen. Semak dokumen bersama supaya prospek nampak syarat dengan jelas.', array['objection · waiting period / panel / maternity / limit']::text[], 12),
('medical', 14, 'Objection: "Waiting Period / Panel / Maternity / Limit"', 3, 'Ada penyakit lama / pre-existing, takut apply sia-sia', 'Terima kasih sebab jujur dari awal {{Name}} 🙂 Bab sakit sedia ada ni, keputusan kelulusan bukan di tangan saya, tapi dinilai oleh pihak underwriter syarikat.

Tugas saya bantu pastikan borang diisi lengkap dan sediakan dokumen rawatan yang diperlukan. Keputusan sama ada lulus standard, ada exclusion, atau caruman diselaraskan adalah hak syarikat.

Nak cuba kongsi dulu tak sakit apa yang pernah dirawat sebelum ni?', 'Jangan beri jaminan kelulusan palsu atau ajar prospek menyembunyikan sejarah kesihatan. Bimbing penyediaan dokumen dan serahkan penilaian kepada bahagian penajajaminan.', array['objection · waiting period / panel / maternity / limit']::text[], 13),
('medical', 15, 'Objection: "Waiting Period / Panel / Maternity / Limit"', 3, 'Nak cover maternity, tengah pregnant atau nak try', 'Persoalan yang sangat bagus, {{Name}} 🙂 Untuk makluman awal, kos bersalin (maternity) bukan automatik ada dalam standard medical card.

Kebanyakan pelan ada tempoh menunggu yang agak panjang (contohnya 9-12 bulan) dan ada syarat khusus. Kalau dah disahkan hamil sekarang, jangan assume kos bersalin tu akan ditanggung.

Biar saya semak dokumen rasmi: sama ada ada rider maternity tambahan, berapa bulan waiting period dia, dan apa yang dikecualikan. Kita buat keputusan ikut fakta hitam putih.', 'Kos bersalin biasanya mempunyai tempoh menunggu yang ketat dan tidak dilindungi oleh kad perubatan standard. Elakkan memberi harapan palsu bagi kehamilan sedia ada.', array['objection · waiting period / panel / maternity / limit']::text[], 14),
('medical', 16, 'Objection: "Waiting Period / Panel / Maternity / Limit"', 3, '"Anak je, I tak payah medical card"', 'Faham {{Name}}, naluri mak ayah memang akan dahulukan perlindungan anak dulu 🙂

Cuma elok kita semak: pelan tu hadnya khas untuk anak sorang ke, atau perkongsian had sekeluarga (sharing limit)? Lepas tu hospital mana yang awak biasa bawa bila dia demam.

Kongsikan ringkasan manfaat pelan anak tu. Kalau dah memang mencukupi, saya akan cakap dah cukup. Kalau ada bahagian yang longgar, baru kita bincang.', 'Hormati naluri ibu bapa yang mengutamakan anak, sambil menyemak had perkongsian atau struktur penama tanpa mendesak pelan dewasa secara keterlaluan.', array['objection · waiting period / panel / maternity / limit']::text[], 15),
('medical', 17, 'Objection: "Waiting Period / Panel / Maternity / Limit"', 3, 'Hospital yang dia pergi bukan panel', 'Boleh {{Name}} 🙂 Cuba bagi tahu nama hospital yang awak sekeluarga selalu pergi tu?

Saya semak senarai panel rasmi terkini pelan ni, sebab senarai ni memang dikemas kini oleh syarikat dari semasa ke semasa. Kalau hospital tu bukan panel, saya akan terangkan cara proses tuntutan (reimbursement) berjalan, bukan suruh awak paksa tukar hospital kegemaran keluarga.', 'Jangan berbalah atau buat andaian dari ingatan. Semak senarai rasmi terkini dan terangkan kaedah bayar-kemudian-tuntut (*reimbursement*) jika ia bukan panel.', array['objection · waiting period / panel / maternity / limit']::text[], 16),
('medical', 18, 'Objection: "Waiting Period / Panel / Maternity / Limit"', 3, 'Room & board rendah, takut kena bayar beza bilik', 'Kebimbangan yang sangat berasas {{Name}} 🙂 Isu had bilik (room & board) ni memang kerap jadi punca kejutan bila dapat bil discharge nanti.

Saya tolong semakkan dalam lembaran sebut harga: berapa had bilik sehari, dan apa syarat pelan sekiranya awak pilih bilik wad yang lebih tinggi. Bukan semua lebihan caj bilik ditanggung automatik.

Awak nampak angka dan kiraan sebenar dulu, lepas tu baru kita adjust pelan atau tetapkan jangkaan yang betul.', 'Perjelaskan perbezaan antara caj bilik asas dengan caj rawatan lain. Berikan contoh praktikal dan jangan jamin sebarang bilik boleh dinaik taraf secara percuma.', array['objection · waiting period / panel / maternity / limit']::text[], 17),
('medical', 19, 'Objection: "Waiting Period / Panel / Maternity / Limit"', 3, 'Takut annual limit habis tengah tahun', 'Faham sangat {{Name}}, had limit tahunan memang angka yang wajib kita faham jelas 🙂 Saya takkan jual janji manis cakap pelan ni ''unlimited dan takkan pernah habis''.

Jom kita buka jadual manfaat: tengok berapa limit setahun, klausa ''as charged'' tu cover sampai takat mana, dan apa perkara yang dikecualikan.

Kalau angka limit tu rasa macam ketat untuk keperluan keluarga awak, kita boleh tengok pilihan pelan dengan had yang lebih tinggi. Keputusan dibuat lepas tengok dokumen.', 'Tunjukkan had tahunan secara telus dalam dokumen rasmi. Elakkan guna perkataan "unlimited" yang mengelirukan pelanggan.', array['objection · waiting period / panel / maternity / limit']::text[], 18),
('medical', 20, 'Objection: "Waiting Period / Panel / Maternity / Limit"', 3, 'Nak medical card sendiri sebelum resign / tamat kad company', 'Langkah beringat awal macam ni memang sangat bagus {{Name}} 🙂 Bila resign, kad company kadang-kadang tamat atau berubah.

Jangan batalkan apa-apa kemudahan company yang masih ada sekarang. Kita semak tarikh akhir cover majikan, lepas tu kita sediakan permohonan pelan peribadi sebagai backup siap-siap.

Permohonan baru belum dikira melindungi sehinggalah syarikat luluskan permohonan tu. Hantar info pelan sedia ada kalau ada, saya tolong tengokkan garis masanya.', 'Perlindungan majikan biasanya tamat mengikut tarikh akhir bekerja. Galakkan persediaan awal tanpa menakutkan prospek atau menyuruh membatalkan apa-apa manfaat yang masih aktif.', array['objection · waiting period / panel / maternity / limit']::text[], 19),
('medical', 21, 'Situasi Live: Hospital, Deposit, Discharge', 4, 'Family WA masa admitted: "Kad ni boleh guna tak?"', 'Saya ada kat sini {{Name}}, jangan panik ya 🙂

Bagi saya 3 benda ni dulu:
1. Nama hospital sekarang
2. Masuk bahagian kecemasan (A&E) atau terus admit ke wad?
3. Gambar kad perubatan atau nombor polisi

Saya bantu semak status panel dan prosedur Guarantee Letter (GL) yang diperlukan pihak hospital. Keputusan kelulusan awal GL tetap tertakluk pada pengesahan diagnosis doktor dan sistem syarikat. Saya bantu pantau prosesnya dari sini.', 'Bantu pandu proses kecemasan dengan tenang tanpa menjamin kelulusan serta-merta. Dapatkan butiran hospital dan nombor polisi untuk tindakan lanjut.', array['situasi live']::text[], 20),
('medical', 22, 'Situasi Live: Hospital, Deposit, Discharge', 4, 'Discharge, bill lebih dari expected, check-in tanpa janji bayar', 'Harap awak dah beransur pulih dan dapat rehat dengan selesa kat rumah {{Name}} 🙂 Bil masa keluar wad kadang-kadang memang boleh timbulkan tanda tanya.

Boleh forward salinan bil terperinci dan laporan discaj dari hospital kat saya. Saya tolong semak item mana yang masuk dalam perlindungan, dan bahagian mana yang tertakluk pada co-takaful, caj bukan perubatan, atau beza bilik.

Keputusan rasmi bayaran tuntutan tetap ikut semakan claim syarikat. Saya tolong susun dokumen, bukan jamin lulus.', 'Mulakan dengan empati terhadap proses pemulihan. Bantu teliti pecahan bil hospital tanpa membuat janji palsu bahawa syarikat akan melunaskan 100% kos.', array['situasi live']::text[], 21),
('medical', 23, 'Situasi Live: Hospital, Deposit, Discharge', 4, 'Hospital kata bukan panel / minta deposit dulu', 'Faham {{Name}}, jangan panik ya. Kebanyakan hospital swasta memang ada prosedur minta cagaran deposit semasa kemasukan walaupun pesakit ada kad perubatan 🙂 Ini polisi dalaman hospital, bukan bermakna kad awak tak sah.

Bagi tahu saya nama hospital tu, biar saya semak status panel rasmi sistem pelan awak. Kalau hospital panel, saya bantu tanya dokumen GL. Deposit tu urusan hospital, saya tak janji auto pulang. Kalau bukan panel, kita tengok proses bayar dulu dan tuntutan (reimbursement) kemudian, ikut terma.', 'Jangan suruh prospek berbalah dengan kaunter pendaftaran hospital. Terangkan polisi deposit hospital swasta dan semak status panel secara tepat.', array['situasi live']::text[], 22),
('medical', 24, 'Situasi Live: Hospital, Deposit, Discharge', 4, 'Malam A&E / anak demam, mesej panic', 'Bawa anak terus jumpa doktor kat bahagian kecemasan dulu {{Name}}! Kesihatan dan keselamatan anak jauh lebih penting daripada sembang pasal kad malam ni 🙂

Bila keadaan anak dah diperiksa dan stabil nanti, baru WhatsApp saya nama hospital dan apa maklumat yang pihak kaunter minta. Saya bantu uruskan dari sudut dokumentasi.

Malam ni kita fokus rawatan anak dulu ya.', 'Dahulukan keselamatan nyawa dan ketenangan pelanggan. Arahkan prospek untuk mendapatkan rawatan doktor serta-merta dan jangan selitkan promosi jualan pada saat cemas.', array['situasi live']::text[], 23)
on conflict (script_set, script_no) do update set
  chapter = excluded.chapter,
  chapter_order = excluded.chapter_order,
  situation = excluded.situation,
  body = excluded.body,
  why = excluded.why,
  tags = excluded.tags,
  sort_order = excluded.sort_order;
