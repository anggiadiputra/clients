export async function validateWhatsappNumber(phone: string, token: string): Promise<boolean | null> {
  if (!phone || !token) return null;

  try {
    // Normalize phone number (e.g. 08123456789 or 628123456789)
    const cleaned = phone.replace(/\D/g, '');
    if (!cleaned) return null;

    const data = new FormData();
    data.append('target', cleaned);
    data.append('countryCode', '62');

    const res = await fetch('https://api.fonnte.com/validate', {
      method: 'POST',
      headers: {
        Authorization: token,
      },
      body: data,
    });

    if (!res.ok) return null;

    const json = await res.json();
    if (json && json.status === true && Array.isArray(json.registered)) {
      return json.registered.length > 0;
    }
    return false;
  } catch (error) {
    console.error('Error validating WA number via Fonnte:', error);
    return null;
  }
}
