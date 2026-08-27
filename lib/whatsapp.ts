export function waLink(phone: string, text?: string) {
  const digits = phone.replace(/\D/g, "");
  const withCountry = digits.startsWith("0") ? "60" + digits.slice(1) : digits;
  const base = `https://wa.me/${withCountry}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
