-- Servicing joins the WhatsApp template categories: once a policy is inforced
-- the messages an agent sends change shape (renewals, claims, card delivery),
-- which is a different lane from closing a sale.
alter type wa_template_category add value if not exists 'servicing' after 'reminder';
