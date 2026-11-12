# Bahasa Malaysia review sheet: Critical Illness (compliance and Shariah)

Compliance-sensitive Bahasa Malaysia strings for the Critical Illness module, with English source. Part of the review sheet in [BM-REVIEW.md](BM-REVIEW.md). **Nothing here is approved yet.** Status for every row: `Not reviewed`.

Keys are in `lib/storyboard/i18n/dict/ci.{en,bm}.ts`; default scripts, checklists, objections and FAQ are in `lib/storyboard/defaults/ci.ts` (`CI_CONTENT_BM`). Wording rules: `lib/storyboard/i18n/GLOSSARY.md`.

Module-wide rules checked in code and tests (`lib/storyboard/__tests__/ci-bm.test.ts`): Great Eastern only; no guarantee wording (no jamin / dijamin / "100%"); the agent-only "[Your story]" field is empty by default and is never in the client summary or WhatsApp text in either language; statistics stay bracketed placeholders.

## CI1. Client summary and WhatsApp (shown to the client)
| Key | English source | Bahasa Malaysia | Status |
|---|---|---|---|
| `ci.summary.gapNote` | This is an estimate for an early-stage diagnosis. The certificate’s definitions decide when a plan pays. | Ini ialah anggaran bagi diagnosis peringkat awal. Takrifan dalam sijil menentukan bila sesuatu pelan membayar. | Not reviewed |
| `ci.summary.planWhy` | Could provide cash during recovery, subject to the PDS & certificate terms. | Boleh menyediakan tunai semasa pemulihan, tertakluk kepada terma Helaian Pendedahan Produk (PDS) dan sijil. | Not reviewed |
| `ci.summary.meaning1` | Need is income, recovery and extra costs over the recovery period. | Keperluan ialah pendapatan, pemulihan dan kos tambahan sepanjang tempoh pemulihan. | Not reviewed |
| `ci.summary.meaning2` | Available is savings plus any existing CI that pays at that stage. | Sedia ada ialah simpanan ditambah sebarang CI sedia ada yang membayar pada peringkat itu. | Not reviewed |
| `ci.wa.could` | Critical illness cover of around {amount} could help with the early-stage gap, subject to the PDS and the certificate's definitions. | Perlindungan penyakit kritikal sekitar {amount} boleh membantu menampung jurang peringkat awal ini, tertakluk kepada terma Helaian Pendedahan Produk (PDS) dan takrifan dalam sijil. | Not reviewed |
| `ci.wa.met` | On these figures, what is available meets the estimated need at an early stage. | Berdasarkan angka ini, jumlah yang sedia ada mencukupi untuk anggaran keperluan pada peringkat awal. | Not reviewed |

## CI2. Early versus late stage, payout and waiver statements
| Key | English source | Bahasa Malaysia | Status |
|---|---|---|---|
| `ci.flow.p.descNo` | A late-stage-only plan pays nothing at an early-stage diagnosis. | Pelan peringkat lewat sahaja tidak membayar apa-apa apabila didiagnosis pada peringkat awal. | Not reviewed |
| `ci.flow.p.descYes` | Added to the savings available for recovery. | Ditambah kepada simpanan yang ada untuk pemulihan. | Not reviewed |
| `ci.flow.w.desc` | Cash for the full recovery period, if the new plan pays at early stage. Subject to the certificate’s definitions. | Tunai untuk keseluruhan tempoh pemulihan, jika pelan baharu membayar pada peringkat awal. Tertakluk kepada takrifan dalam sijil. | Not reviewed |
| `ci.reduce.unsure` | Not yet sure whether a CI payout reduces the base cover. Check the certificate first; the effect on a large hibah matters. | Belum pasti sama ada bayaran CI mengurangkan perlindungan asas. Semak sijil dahulu; kesannya terhadap hibah yang besar adalah penting. | Not reviewed |
| `ci.reduce.yes` | This plan’s CI payout reduces the base cover. Hibah left after a late-stage claim: {left}. | Bayaran CI pelan ini mengurangkan perlindungan asas. Hibah yang berbaki selepas tuntutan peringkat lewat: {left}. | Not reviewed |
| `ci.afford` | With {extra} extra CI cover, the early-stage gap becomes {early} (if the new plan pays {pct}% at early stage) and the late-stage gap {late}. | Dengan tambahan perlindungan CI sebanyak {extra}, jurang peringkat awal menjadi {early} (jika pelan baharu membayar {pct}% pada peringkat awal) dan jurang peringkat lewat {late}. | Not reviewed |
| `ci.sit4.earlyNote` | A staged or standalone plan may pay a portion here | Pelan berperingkat atau berdiri sendiri mungkin membayar sebahagian di sini | Not reviewed |
| `ci.sit4.lateNote` | The balance of the sum covered, less earlier payments | Baki jumlah perlindungan, ditolak bayaran terdahulu | Not reviewed |
| `ci.sit4.caption` | The certificate’s definitions decide when each stage pays | Takrifan dalam sijil menentukan bila setiap peringkat membayar | Not reviewed |
| `ci.fill.waiverYes` / `ci.fill.waiverNo` / `ci.fill.contribHint` | Has waiver / Must pay myself / Counted only without a waiver. | Ada pengecualian caruman / Perlu bayar sendiri / Dikira hanya jika tiada pengecualian caruman. | Not reviewed |
| `ci.fill.calc3` | Early stage: late-only plans pay 0; staged and standalone plans pay the early-stage percentage. Late stage pays the sum covered. Booster and recovery allowance are added. | Peringkat awal: pelan peringkat lewat sahaja membayar 0; pelan berperingkat dan berdiri sendiri membayar peratusan peringkat awal. Peringkat lewat membayar jumlah perlindungan. Booster dan elaun pemulihan ditambah. | Not reviewed |
| `ci.fill.calc5` | An estimate for discussion. The certificate's definitions decide when a plan pays. | Anggaran untuk perbincangan. Takrifan dalam sijil menentukan bila sesuatu pelan membayar. | Not reviewed |
| `ci.appr.1.line` | Cover from early to late stage, subject to the certificate’s definitions. | Perlindungan dari peringkat awal hingga lewat, tertakluk kepada takrifan dalam sijil. | Not reviewed |
| `ci.appr.2.line` | A plan whose benefits can grow with the certificate years, per the PDS. | Pelan yang manfaatnya boleh meningkat mengikut tahun sijil, menurut PDS. | Not reviewed |
| `ci.appr.0.p1` / `p2` / `p3` | One lump-sum payment when the diagnosis meets the definition / Paid while alive; check the survival period / Waiting period: [days]; may be longer for certain illnesses | Satu bayaran sekaligus apabila diagnosis memenuhi takrifan / Dibayar semasa masih hidup; semak tempoh survival / Tempoh menunggu: [hari]; mungkin lebih panjang bagi penyakit tertentu | Not reviewed |
| `ci.explain.geOnly` | Great Eastern Takaful plans only. Fill illness counts, payout percentages, waiting and survival periods from each plan's PDS. Add a GE contribution waiver rider where the payer needs it. | Pelan Great Eastern Takaful sahaja. Isi bilangan penyakit, peratusan bayaran, tempoh menunggu dan tempoh survival daripada PDS setiap pelan. Tambah rider pengecualian caruman GE jika pembayar memerlukannya. | Not reviewed |

## CI3. Critical-illness definitions and certificate checks
| Key | English source | Bahasa Malaysia | Status |
|---|---|---|---|
| `ci.explain.illNote` | The clinical definitions in the certificate decide eligibility, not the name of the illness. The exact list differs by plan. | Takrifan klinikal dalam sijil menentukan kelayakan, bukan nama penyakit. Senarai sebenar berbeza mengikut pelan. | Not reviewed |
| `ci.riskSpec.1` | A general waiting period applies, and it can be longer for some illnesses. [Check the certificate for the days.] | Tempoh menunggu am dikenakan, dan ia mungkin lebih panjang bagi sesetengah penyakit. [Semak sijil untuk bilangan hari.] | Not reviewed |
| `ci.riskSpec.2` | A survival period after diagnosis applies to certain benefits. | Tempoh survival selepas diagnosis dikenakan bagi manfaat tertentu. | Not reviewed |
| `ci.riskSpec.3` | The certificate’s definition decides, not the illness name. Early and late stages have separate criteria. | Takrifan dalam sijil yang menentukan, bukan nama penyakit. Peringkat awal dan lewat mempunyai kriteria berasingan. | Not reviewed |
| `ci.riskSpec.4` | Existing illness, smoking and vaping must be fully declared; non-disclosure is a common reason claims are rejected. | Penyakit sedia ada, merokok dan vape mesti didedahkan sepenuhnya; tidak mendedahkan maklumat ialah antara sebab tuntutan ditolak. | Not reviewed |
| `ci.riskSpec.5` | Loading, exclusion or endorsement may be applied after underwriting. | Caruman tambahan (loading), pengecualian atau endorsan mungkin dikenakan selepas penilaian risiko (underwriting). | Not reviewed |
| `ci.riskSpec.6` | Early and intermediate stage payouts may have a cap on some plans. [Check the PDS.] | Bayaran peringkat awal dan pertengahan mungkin ada had pada sesetengah pelan. [Semak PDS.] | Not reviewed |
| `ci.riskSpec.7` | A rider or certificate may end after the full CI benefit is paid; new cover can be harder after that history. | Rider atau sijil mungkin tamat selepas manfaat CI penuh dibayar; perlindungan baharu boleh jadi lebih sukar selepas sejarah itu. | Not reviewed |
| `ci.riskSpec.8` | Extra cash benefits have their own conditions. Read them in the PDS. | Manfaat tunai tambahan mempunyai syarat tersendiri. Baca dalam PDS. | Not reviewed |
| `ci.cert.0` to `ci.cert.6` (Check the existing certificate) | Rider name and actual rider sum covered; Early stage, or late stage only; Does a CI payout reduce the basic sum covered?; Waiting and survival periods; Exclusions, endorsements, loading; Rider expiry age; Is the amount still right for income and commitments? | Nama rider dan jumlah perlindungan rider sebenar; Peringkat awal, atau peringkat lewat sahaja; Adakah bayaran CI mengurangkan jumlah perlindungan asas?; Tempoh menunggu dan tempoh survival; Pengecualian, endorsan, caruman tambahan (loading); Umur tamat rider; Adakah jumlah ini masih sesuai dengan pendapatan dan komitmen? | Not reviewed |
| `ci.ill.0` to `ci.ill.34` (35 illness names) | Stroke, Heart attack, Kidney failure, Cancer ... Poliomyelitis | Strok, Serangan jantung, Kegagalan buah pinggang, Kanser ... Poliomielitis (see `ci.bm.ts`; medical terms need a clinical reviewer) | Not reviewed |
| `ci.obj.reviewCert` (Step 4 outcome label) | Review existing certificate | Semak sijil sedia ada | Not reviewed |

## CI4. Claim proof and agent-only story
| Key / place | English source | Bahasa Malaysia | Status |
|---|---|---|---|
| `ci.explain.proofIntro` | Use only approved claims you handled, with consent and names hidden. Past claims don't guarantee future claims. Not shown to the client. | Gunakan hanya tuntutan diluluskan yang pernah anda uruskan, dengan kebenaran dan nama disembunyikan. Tuntutan terdahulu bukan petunjuk bahawa tuntutan akan datang pasti dibayar. Tidak dipaparkan kepada klien. | Not reviewed |
| `ci.explain.statNote` | Mortality statistics are not a prediction of an individual's CI claim likelihood. Fill figures from a verified source (for example the latest national statistics) and name the year. | Statistik kematian bukan ramalan kemungkinan seseorang individu membuat tuntutan CI. Isi angka daripada sumber yang disahkan (contohnya statistik kebangsaan terkini) dan nyatakan tahunnya. | Not reviewed |
| `ci.fill.storyPlaceholder` | [Your story] | [Cerita anda] | Not reviewed |
| `ci.fill.storyHint` | Agent-only. Empty by default. Never included in the client summary, the portal or the WhatsApp text. A story is an anecdote, not a claim document. | Untuk ejen sahaja. Kosong secara lalai. Tidak pernah dimasukkan dalam ringkasan klien, portal atau teks WhatsApp. Cerita hanyalah anekdot, bukan dokumen tuntutan. | Not reviewed |
| `ci.stat.0` to `ci.stat.2` | [statistic + source: ...] | [statistik + sumber: ...] (bracketed placeholders only, no real figures) | Not reviewed |
| Script step 4 "Proof" (`CI_CONTENT_BM.script[3]`) | [Your proof] Share one approved CI claim you handled: the plan type, amount and date, with names hidden and the client’s consent. | [Bukti anda] Kongsikan satu tuntutan CI yang telah diluluskan dan pernah anda uruskan: jenis pelan, jumlah dan tarikh, dengan nama disembunyikan dan dengan kebenaran klien. | Not reviewed |

## CI5. Underwriting, claim rejection and objection wording (`defaults/ci.ts`, `CI_CONTENT_BM`)
| Place | English source | Bahasa Malaysia | Status |
|---|---|---|---|
| `riskItems` (11 items: existing illness, smoke/vape, BMI, hospitalised, tests pending, hazardous occupation, risky hobbies, family history, amount vs income, age, incomplete documents) | Examples and likely outcome per item (loading, exclusion, postponement, decline) | Contoh dan kemungkinan hasil bagi setiap item (caruman tambahan, pengecualian, penangguhan, penolakan) | Not reviewed |
| `riskReasons` (6 items: non-disclosure, waiting period, exclusions, certificate lapsed, does not meet the definition, incomplete claim documents) | Why claims get rejected | Mengapa tuntutan ditolak (see file) | Not reviewed |
| Objection: Will CI reduce my hibah cover? | It depends on the plan. Some plans reduce the base cover when a CI payout is made. We check the certificate together before deciding. | Ia bergantung pada pelan. Sesetengah pelan mengurangkan perlindungan asas apabila bayaran CI dibuat. Kita semak sijil bersama-sama sebelum memutuskan. | Not reviewed |
| Objection: I already have a medical card. | A medical card pays the hospital; it isn’t cash for income. Who pays the home instalment while you can’t work? | Kad perubatan membayar hospital; ia bukan tunai untuk menggantikan pendapatan. Siapa yang akan bayar ansuran rumah ketika anda tidak boleh bekerja? | Not reviewed |
| FAQ: If the medical card already paid, can I still claim CI? | CI is paid on a diagnosis that meets the certificate’s definition, not on the bill amount. Check the terms. | CI dibayar apabila diagnosis memenuhi takrifan dalam sijil, bukan berdasarkan jumlah bil. Semak terma. | Not reviewed |
| FAQ: Does everyone get a big payout? | No. It depends on the rider, sum covered, diagnosis, stage and certificate conditions. | Tidak. Ia bergantung pada rider, jumlah perlindungan, diagnosis, peringkat dan syarat sijil. | Not reviewed |
| FAQ: Lump-sum CI vs staged CI? | Lump sum pays once for listed illnesses. Staged covers early to late stages, often with extra benefits. Check each PDS. | CI sekaligus membayar sekali untuk penyakit yang disenaraikan. CI berperingkat melindungi dari peringkat awal hingga lewat, selalunya dengan manfaat tambahan. Semak setiap PDS. | Not reviewed |

## CI6. Takaful rulings
This module makes no Shariah ruling of its own. Takaful objections (not accepting fate, gambling or riba) are the shared common objections in `defaults/common.ts` and are reviewed with the common sheet. The terms used here are `takaful`, `hibah`, `caruman` (never "premium") and `pengecualian caruman` for the contribution waiver.
