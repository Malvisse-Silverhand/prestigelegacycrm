// Age Next Birthday -- the insurance-industry convention of attained age + 1,
// used because premiums are rated off the age the client is about to turn,
// not the age they are today.
export function ageNextBirthday(dobIso: string): number {
  const dob = new Date(dobIso);
  const today = new Date();
  let attained = today.getFullYear() - dob.getFullYear();
  const hadBirthdayThisYear =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hadBirthdayThisYear) attained -= 1;
  return attained + 1;
}
