-- One ready-to-use WhatsApp template per category, in Bahasa Malaysia.
--
-- Template BODIES stay in BM on purpose: these are the words a real client
-- reads, and Prestige Legacy's clients are BM speakers. That is the standing
-- exception to the English-only rule, which covers CRM chrome only.
--
-- Placeholders match fillValues in app/(app)/wa-flow/wa-flow-view.tsx:
--   {{tokNama}}  lead's full name      {{tokAgent}}    agent's full name
--   {{tokProduk}} product on the quote  {{tokCaruman}} monthly contribution
--
-- unit_id is null so every unit can see them. Guarded by title so re-running
-- (or a later `db push` on a fresh environment) can't duplicate them.

insert into wa_templates (title, category, language, body, created_by, unit_id)
select v.title, v.category::wa_template_category, 'BM', v.body,
       (select id from profiles where role = 'superadmin' order by created_at limit 1),
       null
from (values
  ('Salam Perkenalan', 'greeting', $t$Assalamualaikum / Salam sejahtera {{tokNama}},

Saya {{tokAgent}} dari Prestige Legacy, ejen takaful berdaftar.

Terima kasih kerana sudi menghubungi kami. Boleh saya bantu jelaskan pelan perlindungan yang paling sesuai untuk {{tokNama}}?

Bila masa yang sesuai untuk kita berbual sekejap?$t$),

  ('Susulan Selepas Perbualan', 'follow_up', $t$Salam {{tokNama}},

Sekadar menyusuli perbualan kita tempoh hari berkenaan pelan {{tokProduk}}.

Ada apa-apa bahagian yang {{tokNama}} masih ingin saya jelaskan? Saya boleh terangkan semula tanpa sebarang komitmen.

Terima kasih,
{{tokAgent}}$t$),

  ('Pengesahan Temujanji', 'appointment', $t$Salam {{tokNama}},

Sekadar mengesahkan temujanji kita:

Tarikh: _____
Masa: _____
Tempat / Platform: _____

Mohon maklumkan sekiranya perlu ditukar ke masa lain. Saya fleksibel.

Terima kasih,
{{tokAgent}}$t$),

  ('Maklumat Pelan Takaful', 'product_info', $t$Salam {{tokNama}},

Berikut ringkasan pelan {{tokProduk}} yang saya cadangkan:

• Caruman: RM{{tokCaruman}} sebulan
• Perlindungan hospital & pembedahan (cashless di hospital panel)
• Manfaat penyakit kritikal
• Nilai tunai / simpanan jangka panjang

Saya boleh hantar quotation penuh untuk rujukan {{tokNama}}. Mahu saya hantarkan?

{{tokAgent}}$t$),

  ('Ajakan Mendaftar', 'closing', $t$Salam {{tokNama}},

Alhamdulillah, semua maklumat sudah lengkap.

Untuk meneruskan permohonan, saya hanya perlukan:
1. Salinan IC (depan & belakang)
2. Maklumat bank untuk auto-debit
3. Pengesahan caruman RM{{tokCaruman}} sebulan

Proses ambil masa lebih kurang 10 minit sahaja. Boleh kita mulakan hari ini?

{{tokAgent}}$t$),

  ('Peringatan Dokumen / Bayaran', 'reminder', $t$Salam {{tokNama}},

Peringatan mesra berkenaan dokumen yang masih menunggu untuk melengkapkan permohonan takaful {{tokNama}}.

Sekiranya sudah dihantar, mohon abaikan mesej ini. Jika ada sebarang kesulitan, terus WhatsApp saya.

Terima kasih atas kerjasama,
{{tokAgent}}$t$),

  ('Ucapan Terima Kasih', 'other', $t$Salam {{tokNama}},

Terima kasih atas masa dan kepercayaan {{tokNama}} kepada saya hari ini.

Jika ada sebarang pertanyaan berkenaan perlindungan takaful, jangan segan hubungi saya bila-bila masa.

Semoga sihat sejahtera sentiasa.

{{tokAgent}}
Prestige Legacy$t$)
) as v(title, category, body)
where not exists (
  select 1 from wa_templates w where w.title = v.title
);
