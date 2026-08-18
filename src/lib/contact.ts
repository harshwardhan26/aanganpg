export function getAanganPhone() {
  const phone = process.env.NEXT_PUBLIC_AANGAN_PHONE;
  if (process.env.NODE_ENV === 'production' && !phone) {
    throw new Error("HARD REQUIREMENT: NEXT_PUBLIC_AANGAN_PHONE is required in production. No placeholder phone numbers ship.");
  }
  return phone || "+919876543210";
}

export function formatAanganPhoneForDisplay(phone: string) {
  // Assuming E.164 +919822012345
  if (phone.startsWith("+91") && phone.length === 13) {
    return `${phone.slice(0, 3)} ${phone.slice(3, 8)} ${phone.slice(8)}`;
  }
  return phone;
}
