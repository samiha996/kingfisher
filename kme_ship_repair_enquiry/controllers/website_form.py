# Part of KME Ship Repair Enquiry. License LGPL-3.
"""Server-side handling of the Ship Repair Enquiry form.

The form posts to Odoo's standard ``/website/form/crm.lead`` route. This
override only acts on requests carrying the form's marker field, so every
other website form keeps Odoo's default behaviour.

What it adds for this form:
* required-field check (the browser check can be bypassed)
* per-file validation: allowed extensions and 15 MB maximum per file
* duplicate files (same name and size) are dropped instead of attached twice
* a descriptive lead title, e.g. "Ship Repair Enquiry - Drydocking & Special
  Surveys - MV Example"

Record creation, attachments (linked to the lead and listed in its
chatter), visitor tracking and phone formatting stay with Odoo's
``website`` / ``website_crm`` controllers.
"""

import json
import os

from odoo.http import request
from odoo.tools.translate import _

from odoo.addons.website_crm.controllers.website_form import WebsiteForm

MARKER_FIELD = 'kme_ship_repair_enquiry'
FILE_FIELD = 'kme_supporting_documents'
SERVICE_FIELD = 'Service Required'
VESSEL_FIELD = 'Vessel Name'
CONFIRM_FIELD = 'Information Sharing Confirmed'

MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB per file (same rule as the browser)
ALLOWED_EXTENSIONS = {
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv',
    '.jpg', '.jpeg', '.png', '.webp', '.txt',
}
SERVICES = (
    'Drydocking & Special Surveys',
    'Afloat & Emergency Repairs',
    'Propulsion & Engine Overhauling',
    'Structural & Fabrication',
    'Other / Multiple Services',
)
REQUIRED_FIELDS = ('contact_name', 'partner_name', 'email_from', 'description', SERVICE_FIELD, CONFIRM_FIELD)


def _file_size(file_storage):
    stream = file_storage.stream
    position = stream.tell()
    stream.seek(0, os.SEEK_END)
    size = stream.tell()
    stream.seek(position)
    return size


class KmeShipRepairWebsiteForm(WebsiteForm):

    def _handle_website_form(self, model_name, **kwargs):
        if model_name != 'crm.lead' or MARKER_FIELD not in kwargs:
            return super()._handle_website_form(model_name, **kwargs)

        # The marker only identifies the form; never store it on the lead.
        kwargs.pop(MARKER_FIELD, None)
        request.params.pop(MARKER_FIELD, None)

        missing = [name for name in REQUIRED_FIELDS if not str(kwargs.get(name) or '').strip()]
        if missing:
            return json.dumps({
                'error': _("Please complete the required fields, provide a valid email address, "
                           "and check the confirmation box."),
            })
        if kwargs.get(SERVICE_FIELD) not in SERVICES:
            return json.dumps({'error': _("Please select the service required.")})

        seen = set()
        for key in [k for k, v in kwargs.items() if hasattr(v, 'filename')]:
            upload = kwargs[key]
            filename = os.path.basename(upload.filename or '')
            extension = os.path.splitext(filename)[1].lower()
            if extension not in ALLOWED_EXTENSIONS:
                return json.dumps({
                    'error': _('"%(file)s" is not an accepted file type. Accepted: PDF, DOC, DOCX, '
                               'XLS, XLSX, CSV, JPG, PNG, WEBP and TXT.', file=filename),
                })
            size = _file_size(upload)
            if size > MAX_FILE_SIZE:
                return json.dumps({
                    'error': _('"%(file)s" is larger than 15 MB. Please send it by email '
                               'or reduce its size.', file=filename),
                })
            if (filename, size) in seen:
                # Same file selected twice: attach it once.
                kwargs.pop(key)
                request.params.pop(key, None)
                continue
            seen.add((filename, size))

        title_parts = [_("Ship Repair Enquiry"), kwargs[SERVICE_FIELD]]
        reference = str(kwargs.get(VESSEL_FIELD) or kwargs.get('partner_name') or '').strip()
        if reference:
            title_parts.append(reference)
        kwargs['name'] = request.params['name'] = ' - '.join(title_parts)[:250]

        return super()._handle_website_form(model_name, **kwargs)
