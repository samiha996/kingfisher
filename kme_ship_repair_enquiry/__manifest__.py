{
    'name': 'KME Ship Repair Enquiry Form',
    'version': '20.0.1.0.0',
    'category': 'Website/Website',
    'summary': 'Ship Repair Enquiry form on the Contact Us page, creating CRM leads with attached documents',
    'description': """
Replaces the basic Contact Us form with Kingfisher Marine Engineering's
"Ship Repair Enquiry" form:

* service selection cards, contact & vessel details, repair scope
* multi-file supporting documents (15 MB per file, duplicates ignored)
* submissions create a CRM lead (crm.lead) through Odoo's standard
  website form route; uploaded files are attached to the lead
* server-side validation of required fields, file types and file size
""",
    'author': 'Kingfisher Marine Engineering',
    'license': 'LGPL-3',
    'depends': ['website_crm'],
    'data': [
        'views/contactus_templates.xml',
    ],
    'assets': {
        'web.assets_frontend': [
            'kme_ship_repair_enquiry/static/src/scss/ship_repair_enquiry.scss',
            'kme_ship_repair_enquiry/static/src/js/ship_repair_enquiry.js',
        ],
    },
    'installable': True,
    'application': False,
}
