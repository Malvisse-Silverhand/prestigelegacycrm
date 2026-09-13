/**
 * Dummy values for the case form's placeholders.
 *
 * Placeholders used to carry a real certificate's details -- a real plan code,
 * a real IC number, a real contribution. A grey hint is still the operator's
 * data sitting on everyone's screen, and it invites the far worse mistake of
 * an agent reading one as a default and filing it. Everything here is made up
 * and reads that way: "CONTOH" is Malay for "example", and no number below
 * belongs to anybody.
 *
 * Four sets rather than one, picked at random per form, so no single fake
 * value gets familiar enough to be mistaken for a real default.
 */
export type Specimen = {
  planName: string;
  planType: string;
  paymentMethod: string;
  installment: string;
  sumCovered: string;
  idNo: string;
  religion: string;
  nomineeName: string;
  relationship: string;
  phone: string;
  certificateNo: string;
  benefitSum: string;
  benefitContribution: string;
};

export const SPECIMENS: Specimen[] = [
  {
    planName: "Contoh Plan Perlindungan",
    planType: "0000",
    paymentMethod: "Credit Card",
    installment: "150.00",
    sumCovered: "100000",
    idNo: "900101-00-0000",
    religion: "Islam",
    nomineeName: "AMINAH BINTI CONTOH",
    relationship: "Mother",
    phone: "012-000 0000",
    certificateNo: "0000000000",
    benefitSum: "100000",
    benefitContribution: "90.00",
  },
  {
    planName: "Contoh Pelan Perubatan",
    planType: "0001",
    paymentMethod: "Auto Debit",
    installment: "220.50",
    sumCovered: "200000",
    idNo: "880214-00-0001",
    religion: "Buddhist",
    nomineeName: "LIM AH CONTOH",
    relationship: "Spouse",
    phone: "013-000 0001",
    certificateNo: "0000000001",
    benefitSum: "200000",
    benefitContribution: "120.00",
  },
  {
    planName: "Contoh Pelan Simpanan",
    planType: "0002",
    paymentMethod: "FPX",
    installment: "310.00",
    sumCovered: "500000",
    idNo: "950630-00-0002",
    religion: "Hindu",
    nomineeName: "RAJU A/L CONTOH",
    relationship: "Father",
    phone: "017-000 0002",
    certificateNo: "0000000002",
    benefitSum: "500000",
    benefitContribution: "180.00",
  },
  {
    planName: "Contoh Pelan Keluarga",
    planType: "0003",
    paymentMethod: "Standing Instruction",
    installment: "88.80",
    sumCovered: "150000",
    idNo: "010918-00-0003",
    religion: "Christian",
    nomineeName: "SITI BINTI CONTOH",
    relationship: "Sister",
    phone: "019-000 0003",
    certificateNo: "0000000003",
    benefitSum: "150000",
    benefitContribution: "60.00",
  },
];

/**
 * One of the four, chosen at random.
 *
 * Never call this during render: a client component is rendered once on the
 * server and again when it hydrates, and a different pick between the two is a
 * hydration mismatch. Call it from an effect after mount -- see useSpecimen.
 */
export function randomSpecimen(): Specimen {
  return SPECIMENS[Math.floor(Math.random() * SPECIMENS.length)];
}
