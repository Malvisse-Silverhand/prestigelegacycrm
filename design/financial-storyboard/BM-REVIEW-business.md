# Bahasa Malaysia review sheet: Business

Compliance-sensitive Bahasa Malaysia strings for the Business Protection module, with the English source. Layout follows [BM-REVIEW.md](BM-REVIEW.md) section B. **Nothing here is approved.** Status for every row is `Not reviewed`. Wording rules: `lib/storyboard/i18n/GLOSSARY.md`.

Files: dictionary `lib/storyboard/i18n/dict/business.{en,bm}.ts` (key shown), content `lib/storyboard/defaults/business.ts` (`BUSINESS_CONTENT_BM`).

Terms used: keyman = "orang kunci", buy-sell = "beli-jual" / "perjanjian beli-jual", partner = "rakan kongsi", heirs = "waris", estate = "harta pusaka", guarantor = "penjamin" (the word "jaminan" is not used).

## 1. Disclaimers, "could ... subject to PDS and certificate" wording

| Key / place | English source | Bahasa Malaysia | Status |
|---|---|---|---|
| `business.flow.with.title` (last scenario slide) | Each bill could have its own funding | Setiap bil boleh mempunyai pembiayaannya sendiri | Not reviewed |
| `business.flow.with.desc` | Keyman to the company, buy-sell to the partners, loan cover to the bank, hibah to the family. Subject to the PDS & certificate terms. | Orang kunci kepada syarikat, beli-jual kepada rakan kongsi, perlindungan pinjaman kepada bank, hibah kepada keluarga. Tertakluk kepada terma Helaian Pendedahan Produk (PDS) dan sijil. | Not reviewed |
| `business.summary.gapNote` (client summary) | This is an estimate across keyman, buy-sell and loan protection. Shown before any cover is arranged. | Ini ialah anggaran merentasi perlindungan orang kunci, beli-jual dan pinjaman. Ditunjukkan sebelum sebarang perlindungan diatur. | Not reviewed |
| `business.summary.planWhy` (client summary) | Each need could have its own funding, subject to the PDS & certificate terms. | Setiap keperluan boleh mempunyai pembiayaannya sendiri, tertakluk kepada terma PDS dan sijil. | Not reviewed |
| `business.wa.closing` (WhatsApp) | Each need could have its own funding, subject to the PDS and certificate terms. Tax and legal points should be confirmed with your accountant and lawyer. | Setiap keperluan boleh mempunyai pembiayaannya sendiri, tertakluk kepada terma PDS dan sijil. Perkara cukai dan undang-undang perlu disahkan dengan akauntan dan peguam anda. | Not reviewed |
| `business.explain.note` | Agent explanation aid. Not an official operator document, a business valuation, or tax or legal advice. | Alat bantu penerangan untuk ejen. Bukan dokumen rasmi pengendali, penilaian perniagaan, atau nasihat cukai atau undang-undang. | Not reviewed |
| `business.fill.assump7` | Planning estimates only, not a business valuation, quotation, or tax or legal advice. | Hanya anggaran perancangan, bukan penilaian perniagaan, sebut harga, atau nasihat cukai atau undang-undang. | Not reviewed |
| `business.obj.footnote` | Responses are conversation guides for registered agents. Tax, legal and valuation questions must be confirmed with a tax agent, lawyer or accountant. | Jawapan ialah panduan perbualan untuk ejen berdaftar. Soalan cukai, undang-undang dan penilaian mesti disahkan dengan ejen cukai, peguam atau akauntan. | Not reviewed |

## 2. Keyman, buy-sell and loan wording

| Key / place | English source | Bahasa Malaysia | Status |
|---|---|---|---|
| `business.flow.bank.title` | The bank calls the personal guarantee | Bank menuntut daripada penjamin peribadi | Not reviewed |
| `business.flow.bank.desc` | Claimed from {guarantor}'s estate before the heirs receive anything. | Dituntut daripada harta pusaka {guarantor} sebelum waris menerima apa-apa. | Not reviewed |
| `business.flow.partners.desc` | The remaining partners must buy them out, or share control with heirs who may not be involved. | Rakan kongsi yang tinggal perlu membeli saham itu, atau berkongsi kawalan dengan waris yang mungkin tidak terlibat dalam perniagaan. | Not reviewed |
| `business.summary.meaning1` / `meaning3` (client) | Keyman is the cost of lost profit and replacing a key person. / Loan is the personally guaranteed debt without protection. | Orang kunci ialah kos keuntungan yang hilang dan kos mencari pengganti bagi orang penting. / Pinjaman ialah hutang yang ditanggung penjamin secara peribadi tanpa perlindungan. | Not reviewed |
| `business.fill.keymanIntro` | Keyman = the company protects itself from losses when a key person is gone. Money is paid to the company, not the heirs. | Orang kunci = syarikat melindungi dirinya daripada kerugian apabila orang penting tiada. Wang dibayar kepada syarikat, bukan waris. | Not reviewed |
| `business.fill.buysellIntro` | Buy-sell = an agreement + takaful funding, so partners buy at an agreed price and heirs receive cash. | Beli-jual = perjanjian + pembiayaan takaful, supaya rakan kongsi membeli pada harga yang dipersetujui dan waris menerima wang tunai. | Not reviewed |
| `business.fill.loanIntro` | A director who gave a personal undertaking is personally liable. If they die, the bank can claim from their estate. | Pengarah yang memberi komitmen peribadi sebagai penjamin menanggungnya secara peribadi. Jika beliau meninggal, bank boleh menuntut daripada harta pusakanya. | Not reviewed |
| `business.fill.debtNote` | The bank can claim from the estate before the heirs receive anything. | Bank boleh menuntut daripada harta pusaka sebelum waris menerima apa-apa. | Not reviewed |
| `business.fill.agreementHint` / Risk point 3 | Without a written agreement, heirs can dispute the share price. / Buy-sell needs a valuation basis and an agreement; partners need an insurable interest in each other. | Tanpa perjanjian bertulis, waris boleh mempertikaikan harga saham. / Beli-jual memerlukan asas penilaian dan perjanjian; rakan kongsi perlu mempunyai kepentingan boleh diinsuranskan antara satu sama lain. | Not reviewed |
| `business.risk.point2` | The Keyman amount must be justified by profit contribution or a reasonable salary multiple. | Jumlah orang kunci mesti dijustifikasikan oleh sumbangan kepada keuntungan atau gandaan gaji yang munasabah. | Not reviewed |
| `business.risk.point4` | Loan cover is usually limited to the outstanding balance and may be assigned to the bank. | Perlindungan pinjaman biasanya terhad kepada baki tertunggak dan mungkin diserahkan hak kepada bank. | Not reviewed |
| Script (Keyman, Solution) | Keyman takaful is owned by the company and pays the company, so it can hire, train and keep paying staff and suppliers, subject to the certificate terms. | Takaful orang kunci dimiliki oleh syarikat dan dibayar kepada syarikat, jadi ia boleh mengambil pekerja, melatih dan terus membayar gaji serta pembekal, tertakluk kepada terma sijil. | Not reviewed |
| Script (Buy-sell, Solution) | A written buy-sell agreement plus takaful funding: the partners keep control, and the heirs receive cash at an agreed price. Check the agreement with the company's lawyer. | Perjanjian beli-jual bertulis ditambah pembiayaan takaful: rakan kongsi mengekalkan kawalan, dan waris menerima wang tunai pada harga yang dipersetujui. Semak perjanjian itu dengan peguam syarikat. | Not reviewed |
| Script (Loan, Solution) | Loan protection can settle the debt so the family keeps the house and savings, subject to the certificate terms. | Perlindungan pinjaman boleh melunaskan hutang supaya keluarga mengekalkan rumah dan simpanan, tertakluk kepada terma sijil. | Not reviewed |
| Objection: "The bank already has loan protection." | Check the amount and term. Overdrafts, hire purchase and trade lines are often not covered, but may still fall on the owner personally. | Semak jumlah dan tempohnya. Overdraf, sewa beli dan kemudahan perdagangan selalunya tidak dilindungi, tetapi mungkin masih jatuh ke atas pemilik secara peribadi. | Not reviewed |
| Objection: "We trust each other, no need for an agreement." | Trust helps today. The heirs of a partner may not share it, which is why a written agreement protects everyone. | Kepercayaan membantu hari ini. Waris seorang rakan kongsi mungkin tidak berkongsinya, itulah sebabnya perjanjian bertulis melindungi semua pihak. | Not reviewed |

## 3. Succession, estate and hibah statements

| Key / place | English source | Bahasa Malaysia | Status |
|---|---|---|---|
| `business.entity.sdn.d` | A separate legal entity. Company assets and accounts are not frozen when an owner dies, but the owner's shares become part of the estate. | Entiti undang-undang yang berasingan. Aset dan akaun syarikat tidak dibekukan apabila pemilik meninggal dunia, tetapi saham pemilik menjadi sebahagian daripada harta pusaka. | Not reviewed |
| `business.entity.plt.d` | A separate legal entity. A partner's interest becomes part of the estate; check the LLP agreement for exit and buy-out. | Entiti undang-undang yang berasingan. Kepentingan seorang rakan kongsi menjadi sebahagian daripada harta pusaka; semak perjanjian LLP untuk keluar dan pembelian saham. | Not reviewed |
| `business.entity.partner.d` | Not a separate entity. Business debts are the partners' personal debts, and a deceased partner's share becomes part of the estate. | Bukan entiti berasingan. Hutang perniagaan ialah hutang peribadi para rakan kongsi, dan bahagian rakan kongsi yang meninggal menjadi sebahagian daripada harta pusaka. | Not reviewed |
| `business.entity.sole.d` | Owner and business are the same in law. Accounts, stock and assets can be frozen until the estate is settled, and business debt is personal. | Pemilik dan perniagaan adalah sama di sisi undang-undang. Akaun, stok dan aset boleh dibekukan sehingga harta pusaka diselesaikan, dan hutang perniagaan ialah hutang peribadi. | Not reviewed |
| `business.fill.entIntro` | ...can be frozen until letters of administration and distribution are settled, while salaries, rent, suppliers and instalments keep running. | ...boleh dibekukan sehingga surat kuasa mentadbir dan pembahagian diselesaikan, sedangkan gaji, sewa, pembekal dan ansuran terus berjalan. | Not reviewed |
| `business.flow.estate.title` / `desc` | Accounts & assets may freeze / Cash the family needs while the estate is settled and the business keeps running. | Akaun & aset mungkin dibekukan / Wang tunai yang diperlukan keluarga semasa harta pusaka diselesaikan dan perniagaan terus berjalan. | Not reviewed |
| `business.fill.frozenNote` | Why hibah takaful: it can be paid directly to the named beneficiary, not through the estate, subject to a valid nomination and the certificate terms. | Mengapa takaful hibah: ia boleh dibayar terus kepada penerima yang dinamakan, bukan melalui harta pusaka, tertakluk kepada penamaan yang sah dan terma sijil. | Not reviewed |
| Script (Enterprise, Solution) | Hibah takaful can be paid directly to the beneficiary you name, rather than through the estate, subject to a valid nomination and the certificate terms. | Takaful hibah boleh dibayar terus kepada penerima yang anda namakan, bukan melalui harta pusaka, tertakluk kepada penamaan yang sah dan terma sijil. | Not reviewed |
| Script (Enterprise, Close) | Let's start with hibah for your spouse, and arrange a will so the business can continue or be sold in an orderly way. | Mari kita mulakan dengan hibah untuk pasangan anda, dan sediakan wasiat supaya perniagaan boleh diteruskan atau dijual dengan teratur. | Not reviewed |
| FAQ: "Can I use my existing personal hibah?" | Yes, for the family need. For buy-sell and Keyman, the owner and beneficiary must match the business purpose. | Boleh, untuk keperluan keluarga. Bagi beli-jual dan orang kunci, pemilik dan penerima mesti sepadan dengan tujuan perniagaan. | Not reviewed |
| `business.matrix.ownLife` | {name} (own life, hibah to partners) | {name} (nyawa sendiri, hibah kepada rakan kongsi) | Not reviewed |

## 4. Tax and plan-type statements

| Key / place | English source | Bahasa Malaysia | Status |
|---|---|---|---|
| `business.explain.planNote` | Great Eastern Takaful plans only. For Keyman, buy-sell and loans, focus on pure protection (term) from the GE range... Plans with an investment element can make tax treatment unclear for company-owned certificates; confirm with a tax adviser. | Pelan Great Eastern Takaful sahaja. Untuk orang kunci, beli-jual dan pinjaman, utamakan perlindungan tulen (berjangka) daripada rangkaian GE... Pelan yang ada unsur pelaburan boleh menjadikan layanan cukai tidak jelas bagi sijil milik syarikat; sahkan dengan penasihat cukai. | Not reviewed |
| `business.explain.tax1d` | Usually the certificate should have no investment element, for example term or accident cover. Confirm with a tax adviser. | Lazimnya sijil tidak sepatutnya mempunyai unsur pelaburan, contohnya perlindungan berjangka atau kemalangan. Sahkan dengan penasihat cukai. | Not reviewed |
| `business.explain.tax2d` | Restrictions can apply for directors with shares in a controlled company, partners and sole proprietors. Check with a tax agent. | Sekatan mungkin terpakai bagi pengarah yang memegang saham dalam syarikat terkawal, rakan kongsi dan pemilik tunggal. Semak dengan ejen cukai. | Not reviewed |
| `business.explain.tax3d` | Ask your tax adviser to confirm the current inland revenue ruling on key-man cover and how it treats takaful products. | Minta penasihat cukai anda mengesahkan keputusan Lembaga Hasil Dalam Negeri yang terkini mengenai perlindungan orang kunci dan cara ia melayan produk takaful. | Not reviewed |
| Objection: "It's just another business cost." | It's a small, known cost set against a large, unknown one. Keyman may also be tax-deductible if it meets the conditions; confirm with your tax agent. | Ia kos kecil yang diketahui berbanding kos besar yang tidak diketahui. Orang kunci mungkin boleh ditolak cukai jika memenuhi syarat; sahkan dengan ejen cukai anda. | Not reviewed |
| FAQ: "Is the Keyman contribution tax-deductible?" | It may be, if it meets the conditions in the relevant tax ruling. Confirm with a tax agent. | Mungkin, jika memenuhi syarat dalam keputusan cukai yang berkaitan. Sahkan dengan ejen cukai. | Not reviewed |

## 5. Underwriting and claims wording (business-specific)

| Key / place | English source | Bahasa Malaysia | Status |
|---|---|---|---|
| Risk item: "Amount not justified by financials" | ...Likely outcome: financial underwriting with accounts, tax returns and valuation basis; may be reduced or declined. | ...Kemungkinan hasil: penilaian risiko (underwriting) kewangan dengan akaun, penyata cukai dan asas penilaian; jumlah mungkin dikurangkan atau ditolak. | Not reviewed |
| Risk item: "No insurable interest / ownership unclear" | The certificate owner has no financial interest in the life assured. Likely outcome: declined or restructured. | Pemilik sijil tidak mempunyai kepentingan kewangan terhadap nyawa yang diinsuranskan. Kemungkinan hasil: ditolak atau distruktur semula. | Not reviewed |
| Risk item: "Smoke / vape" | Never declare non-smoker if you smoke: a claim can be rejected. | Jangan sekali-kali isytihar bukan perokok jika anda merokok: tuntutan boleh ditolak. | Not reviewed |
| Risk reason: "No buy-sell agreement" | Without a written agreement the heirs may refuse to sell, or dispute the price, even after a payout. | Tanpa perjanjian bertulis, waris mungkin enggan menjual, atau mempertikaikan harga, walaupun selepas bayaran dibuat. | Not reviewed |
| Risk reason: "Non-disclosure" | Health or financial information not declared at application. A common reason claims are rejected or certificates cancelled. | Maklumat kesihatan atau kewangan tidak diisytiharkan semasa permohonan. Sebab lazim tuntutan ditolak atau sijil dibatalkan. | Not reviewed |
| `business.risk.point6` | Each life is underwritten separately. If one partner is declined or loaded, plan an alternative so the arrangement still works. | Setiap nyawa dinilai risikonya secara berasingan. Jika seorang rakan kongsi ditolak atau dikenakan caruman tambahan (loading), rancang alternatif supaya susunan ini masih berfungsi. | Not reviewed |

## Notes for the reviewer

- Shared objection and FAQ answers on takaful, Shariah and "guaranteed" questions come from the common content; they are in [BM-REVIEW.md](BM-REVIEW.md) section A3.
- The client summary lists the company name and the main guarantor's name inside the scenario slides. This is the existing behaviour and was not changed.
- The partner-share warning ("Partner shares total X%, not 100%") is shown on the screen only. It is not in the client summary or the WhatsApp text.
