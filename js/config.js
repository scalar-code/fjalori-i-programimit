// Settings for the contact form (EmailJS, https://www.emailjs.com).
// These three values are meant to be public — EmailJS designs them to live in website code.
// Get them from the EmailJS dashboard: see README → "Contact form".
export const EMAILJS = {
  publicKey: "",   // Account → General → Public Key
  serviceId: "",   // Email Services → your Outlook service → Service ID
  templateId: "",  // Email Templates → your template → Template ID
};

export const isContactFormReady = () => Boolean(EMAILJS.publicKey && EMAILJS.serviceId && EMAILJS.templateId);
