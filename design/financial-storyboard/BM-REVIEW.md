# Bahasa Malaysia review sheet (compliance and Shariah)

Every compliance-sensitive Bahasa Malaysia string, with its English source, grouped by module. For the Shariah and compliance reviewer to read and sign off. **Nothing here is approved yet.** Status for every row: `Not reviewed`.

Where each string lives is given as `file` plus key or position, so a correction is a one-line edit. Wording rules are in `lib/storyboard/i18n/GLOSSARY.md`.

Module sections for Medical, Critical Illness and Business are kept in their own files so the three translation agents do not collide:
[BM-REVIEW-medical.md](BM-REVIEW-medical.md), [BM-REVIEW-ci.md](BM-REVIEW-ci.md), [BM-REVIEW-business.md](BM-REVIEW-business.md).

## A. Common (all modules)

### A1. Disclaimers
| Key / place | English source | Bahasa Malaysia | Status |
|---|---|---|---|
| `disclaimer.default` (shown to the client with every summary) | This is an illustration to help you understand your needs, not an offer, quotation or guarantee. Benefits are subject to the product disclosure sheet and certificate terms. | Ini ialah ilustrasi untuk membantu anda memahami keperluan anda, bukan tawaran, sebut harga atau jaminan. Manfaat tertakluk kepada helaian pendedahan produk dan terma sijil. | Not reviewed |
| `wa.disclaimer` (end of every WhatsApp text) | These are estimates for discussion, not a quotation. Benefits and contributions are subject to the product disclosure sheet, the official illustration and the certificate terms. | Ini ialah anggaran untuk perbincangan, bukan sebut harga. Manfaat dan caruman tertakluk kepada helaian pendedahan produk, ilustrasi rasmi dan terma sijil. | Not reviewed |
| `page.disclaimer1` | The Financial Storyboard is a discussion and planning aid for registered takaful agents. It is not an official document of any takaful operator. | Storyboard Kewangan ialah alat bantu perbincangan dan perancangan untuk ejen takaful berdaftar. Ia bukan dokumen rasmi mana-mana pengendali takaful. | Not reviewed |
| `page.disclaimer2` | All calculations, product examples and figures are estimates and educational illustrations only. They are not a quotation or contract, and not financial, tax, legal or medical advice. | Semua pengiraan, contoh produk dan angka hanyalah anggaran dan ilustrasi pendidikan. Ia bukan sebut harga atau kontrak, dan bukan nasihat kewangan, cukai, undang-undang atau perubatan. | Not reviewed |
| `page.disclaimer3` | Actual benefits, contributions and terms are subject to the Product Disclosure Sheet, official illustration, certificate and the operator's underwriting. Prospects must disclose health information fully and truthfully through official channels. | Manfaat, caruman dan terma sebenar tertakluk kepada Helaian Pendedahan Produk (PDS), ilustrasi rasmi, sijil dan penilaian risiko (underwriting) pengendali. Prospek mesti mendedahkan maklumat kesihatan dengan lengkap dan benar melalui saluran rasmi. | Not reviewed |
| `page.disclaimer4` | PDPA 2010: data saved here is stored against this lead in the CRM, visible to the assigned agent and upline only. Use nicknames; never enter IC numbers or detailed medical information. | PDPA 2010: data yang disimpan di sini disimpan pada lead ini dalam CRM, dan hanya boleh dilihat oleh ejen yang ditugaskan dan barisan atasan. Gunakan nama panggilan; jangan sekali-kali masukkan nombor IC atau maklumat perubatan terperinci. | Not reviewed |
| `obj.footnote` | Responses are conversation guides for registered agents. Product terms, contributions and Shariah positions must follow the operator's official materials. | Jawapan ialah panduan perbualan untuk ejen berdaftar. Terma produk, caruman dan pendirian Syariah mesti mengikut bahan rasmi pengendali. | Not reviewed |

### A2. Underwriting and claims wording
| Key / place | English source | Bahasa Malaysia | Status |
|---|---|---|---|
| `risk.intro` | Tick what applies to {subject}. This is a guide to likely outcomes; the actual decision is made by the underwriter. | Tandakan apa yang terpakai kepada {subject}. Ini ialah panduan kepada kemungkinan hasil; keputusan sebenar dibuat oleh penilai risiko (underwriter). | Not reviewed |
| `risk.note.High` | Possible postponement, exclusion or decline. Discuss before submitting, and prepare an alternative plan. | Mungkin ditangguhkan, dikecualikan atau ditolak. Bincang sebelum menghantar, dan sediakan pelan alternatif. | Not reviewed |
| `risk.disclose` | Disclose fully and honestly. An exclusion for one condition is far better than an entire claim being rejected. | Dedahkan dengan lengkap dan jujur. Pengecualian bagi satu keadaan jauh lebih baik daripada keseluruhan tuntutan ditolak. | Not reviewed |
| Why claims get rejected (`defaults/common.ts`, `COMMON_RISK_REASONS_BM`), 6 items | Non-disclosure; Waiting period; Exclusions; Certificate lapsed; Doesn't meet the definition; Incomplete claim documents | Tidak mendedahkan maklumat; Tempoh menunggu; Pengecualian; Sijil luput; Tidak menepati takrifan; Dokumen tuntutan tidak lengkap (see file for the explanations) | Not reviewed |

### A3. Objection answers on takaful, Shariah and guarantees (`defaults/common.ts`, `COMMON_OBJECTIONS_BM` / `COMMON_FAQ_BM`)
| English question and answer (source) | Bahasa Malaysia | Status |
|---|---|---|
| "Takaful means not accepting fate (takdir)." Takaful is planning and effort (ikhtiar), then we leave the outcome to Allah. Like locking the house before travelling. | "Takaful bermakna tidak reda dengan takdir." Takaful ialah perancangan dan usaha (ikhtiar), kemudian kita bertawakal kepada Allah. Seperti mengunci rumah sebelum bermusafir. | Not reviewed |
| "It's like gambling / riba." Takaful is built on mutual help (ta'awun) and donation (tabarru'), and products are reviewed by the operator's Shariah committee. I can show you the Shariah concept in the PDS. | "Takaful sama seperti judi / riba." Takaful dibina atas dasar tolong-menolong (ta'awun) dan derma (tabarru'), dan produknya disemak oleh jawatankuasa Syariah pengendali. Saya boleh tunjukkan konsep Syariahnya dalam PDS. | Not reviewed |
| "Afraid that buying it will make it happen." Planning doesn't invite misfortune. It simply means the family is prepared, whatever happens. | "Takut kalau beli nanti perkara itu benar-benar berlaku." Merancang tidak mengundang malang. Ia hanya bermakna keluarga bersedia, apa pun yang berlaku. | Not reviewed |
| "Takaful claims are difficult." Most claim problems come from non-disclosure or missing documents. ... [statistic + source, if you use one] | "Tuntutan takaful susah." Kebanyakan masalah tuntutan berpunca daripada maklumat yang tidak didedahkan atau dokumen yang tidak lengkap. ... [statistik + sumber, jika anda menggunakannya] | Not reviewed |
| FAQ: "Are contributions and cash values guaranteed?" Contributions can be revised under the certificate terms. Investment-linked cash values are not guaranteed. Check the PDS. | "Adakah caruman dan nilai tunai dijamin?" Caruman boleh disemak semula mengikut terma sijil. Nilai tunai berkaitan pelaburan tidak dijamin. Semak PDS. (Note: uses "dijamin" only inside a question and a negation.) | Not reviewed |
| FAQ: "What if I already have health problems?" Declare everything. The underwriter may accept on standard terms, add a loading, exclude a condition or postpone. | "Bagaimana jika saya sudah ada masalah kesihatan?" Dedahkan semuanya. Penilai risiko (underwriter) mungkin menerima dengan terma standard, menambah caruman tambahan (loading), mengecualikan sesuatu keadaan atau menangguhkan. | Not reviewed |

## B. Hibah

### B1. "Could fill the gap" and subject-to wording (no guarantee, no 100%)
| Key / place | English source | Bahasa Malaysia | Status |
|---|---|---|---|
| `hibah.flow.h.title` (scenario slide) | A hibah of {gap} could fill the gap | Hibah sebanyak {gap} boleh membantu menampung jurang ini | Not reviewed |
| `hibah.flow.h.desc` | Could fill the gap, subject to the PDS & certificate terms. Paid to the named beneficiary under a conditional hibah nomination. | Boleh membantu menampung jurang ini, tertakluk kepada terma Helaian Pendedahan Produk (PDS) dan sijil. Dibayar kepada penerima yang dinamakan di bawah penamaan hibah bersyarat. | Not reviewed |
| `hibah.flow.h.meterLabel` / `meterText` | Need covered if the cover is in place / Subject to terms | Keperluan yang ditampung jika perlindungan ini diperoleh / Tertakluk kepada terma | Not reviewed |
| `hibah.summary.gapNote.gap` (client) | This is an estimate based on the figures discussed. A hibah could fill the gap, subject to the PDS & certificate terms. | Ini ialah anggaran berdasarkan angka yang dibincangkan. Hibah boleh membantu menampung jurang ini, tertakluk kepada terma Helaian Pendedahan Produk (PDS) dan sijil. | Not reviewed |
| `hibah.summary.planWhy` (client) | Could help the family cover the gap, subject to the PDS & certificate terms. | Boleh membantu keluarga menampung jurang ini, tertakluk kepada terma PDS dan sijil. | Not reviewed |
| `hibah.wa.could` (WhatsApp) | A hibah of around {amount} could fill the gap, subject to the PDS & certificate terms. | Hibah sekitar {amount} boleh membantu menampung jurang ini, tertakluk kepada terma Helaian Pendedahan Produk (PDS) dan sijil. | Not reviewed |
| `scene.official` | From official illustration | Daripada ilustrasi rasmi | Not reviewed |

### B2. Hibah and Shariah statements (`defaults/hibah.ts`, `HIBAH_CONTENT_BM`)
| English source | Bahasa Malaysia | Status |
|---|---|---|
| Script "Explain hibah": With a conditional hibah nomination, the death benefit is paid to the beneficiary you name, subject to the certificate and a valid nomination. An executor (wasi) only administers the estate. | Dengan penamaan hibah bersyarat, manfaat kematian dibayar kepada penerima yang anda namakan, tertakluk kepada sijil dan penamaan yang sah. Wasi (pelaksana) hanya mentadbir harta pusaka. | Not reviewed |
| FAQ: "Is this hibah subject to faraid?" With a valid conditional hibah nomination, the benefit is paid to the beneficiary you name, subject to the certificate terms. I'll show you the operator's exact wording. | "Adakah hibah ini tertakluk kepada faraid?" Dengan penamaan hibah bersyarat yang sah, manfaat dibayar kepada penerima yang anda namakan, tertakluk kepada terma sijil. Saya akan tunjukkan perkataan tepat daripada pengendali. | Not reviewed |
| FAQ: "Is hibah takaful the same as a medical card?" ... pays a lump sum to your beneficiaries on death (and TPD if included). | "Adakah hibah takaful sama dengan kad perubatan?" ... membayar sejumlah wang sekaligus kepada penerima anda apabila berlaku kematian (dan TPD jika disertakan). | Not reviewed |
| FAQ: "Is critical illness included?" It depends on the plan and any rider added. Check the Product Disclosure Sheet before assuming it is covered. | "Adakah penyakit kritikal termasuk?" Ia bergantung pada pelan dan sebarang rider yang ditambah. Semak Helaian Pendedahan Produk sebelum menganggap ia dilindungi. | Not reviewed |
| Objection: "My home loan already has MRTT." MRTT only clears the loan; the family still needs money for daily living, school and other debts. | "Pinjaman rumah saya sudah ada MRTT." MRTT hanya melunaskan pinjaman; keluarga masih memerlukan wang untuk sara hidup harian, persekolahan dan hutang lain. | Not reviewed |
| `hibah.explain.execTitle` / `execBody` | Executor (wasi) / Distributes by faraid. | Wasi (pelaksana) / Mengagihkan mengikut faraid. | Not reviewed |
| `hibah.risk.point2` | The hibah nomination must be valid and complete; inform the beneficiaries. | Penamaan hibah mesti sah dan lengkap; maklumkan kepada para penerima. | Not reviewed |
| `hibah.fill.noteDeath` | Death scenario: calculates provision for the family. Conditional hibah nomination relates to the death benefit. | Senario kematian: mengira peruntukan untuk keluarga. Penamaan hibah bersyarat berkaitan dengan manfaat kematian. | Not reviewed |

### B3. Medical and critical-illness claims wording inside Hibah
| Key / place | English source | Bahasa Malaysia | Status |
|---|---|---|---|
| `hibah.fill.noteTpd` | TPD scenario: income stops but the insured still needs to be supported, often with extra care costs. Check whether the plan includes TPD and how it is defined. | Senario TPD: pendapatan terhenti tetapi individu yang dilindungi masih perlu ditanggung, selalunya dengan kos penjagaan tambahan. Semak sama ada pelan merangkumi TPD dan bagaimana ia ditakrifkan. | Not reviewed |
| `hibah.risk.point1` | Hibah: a large amount may need a medical examination and financial underwriting. | Hibah: jumlah yang besar mungkin memerlukan pemeriksaan perubatan dan penilaian risiko (underwriting) kewangan. | Not reviewed |
| `hibah.explain.multsNote` | ... confirm each figure against the plan's PDS before showing a prospect. | ... sahkan setiap angka dengan PDS pelan sebelum menunjukkannya kepada prospek. | Not reviewed |

## C. Mortgage
Not translated yet (module not built; Phase 4b).
