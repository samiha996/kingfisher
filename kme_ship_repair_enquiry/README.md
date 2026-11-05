# KME Ship Repair Enquiry (Odoo 20 Community)

Replaces the Contact Us form with the Ship Repair Enquiry form. Submissions
create a CRM lead/opportunity (crm.lead) with uploaded documents attached.

## Install (CloudPepper)
1. Upload the `kme_ship_repair_enquiry` folder to your custom addons path
   (the git repo / addons folder linked to the CloudPepper instance).
2. Restart Odoo, then Apps > Update Apps List > install "KME Ship Repair Enquiry Form".
   Dependency: Contact Form (website_crm), installed automatically.
3. Open /contactus.

The module carries the designer's builder version of the page and is applied
on top of the existing builder-edited copy at install time.

## Field mapping (crm.lead)
| Form field                     | Lead field                         |
|--------------------------------|------------------------------------|
| Your name                      | contact_name                       |
| Company                        | partner_name                       |
| Work email                     | email_from                         |
| Phone / WhatsApp               | phone                              |
| Repair scope / description     | description (Internal Notes)       |
| Service, Vessel, Port, Confirm | appended to description            |
| (generated)                    | name: "Ship Repair Enquiry - <service> - <vessel or company>" |
| Supporting documents           | attachments on the lead + chatter note "Attached files" |

Limits: PDF, DOC(X), XLS(X), CSV, JPG, PNG, WEBP, TXT; 15 MB per file;
duplicates (same name+size) ignored. Checked in the browser and on the server.
Odoo's request limit is 128 MB total; check CloudPepper's nginx
client_max_body_size is at least as large as the uploads you expect.
