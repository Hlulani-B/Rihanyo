export async function sendEmail(email) {
  const response = await fetch("https://api-treupobaqq-uc.a.run.app/rihanyo/practice_registration", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();
  console.log(data);
  return data;
}