// Settings for the contact form (EmailJS, https://www.emailjs.com).
// These three values are meant to be public — EmailJS designs them to live in website code.
// Get them from the EmailJS dashboard: see README → "Contact form".
export const EMAILJS = {
  publicKey: "PKgb-rZZ6j3eDXzuR",   // Account → General → Public Key
  serviceId: "service_x96v4rb",   // Email Services → your Outlook service → Service ID
  templateId: "template_tonfalq",  // Email Templates → your template → Template ID
};

export const isContactFormReady = () => Boolean(EMAILJS.publicKey && EMAILJS.serviceId && EMAILJS.templateId);
