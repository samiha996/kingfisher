/**
 * KME Ship Repair Enquiry form behaviour.
 *
 * Extends Odoo's own website form interaction (website.form) instead of
 * adding a second, competing handler: Odoo keeps validation, reCAPTCHA,
 * submission to /website/form/crm.lead and the success redirect. Everything
 * below only runs for the form carrying the `kme-form` class; other website
 * forms are left untouched.
 *
 * Supporting documents: the selected files are kept in the real
 * <input type="file">, which is what Odoo submits, so they are uploaded and
 * attached to the created lead.
 */
import { patch } from "@web/core/utils/patch";
import { _t } from "@web/core/l10n/translation";
import { Form } from "@website/snippets/s_website_form/form";

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB per file, also enforced server-side.
const ALLOWED_EXTENSIONS = /\.(pdf|doc|docx|xls|xlsx|csv|jpg|jpeg|png|webp|txt)$/i;
const SERVICE_PARAM_VALUES = ["drydocking", "afloat", "propulsion", "structural", "other"];
const FILE_ICON_PATH = "M6 2h8l5 5v15H6zM14 2v6h5M9 13h7M9 17h7";

function formatSize(bytes) {
    return bytes > 1024 * 1024
        ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
        : `${(bytes / 1024).toFixed(0)} KB`;
}

function fileIcon() {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", FILE_ICON_PATH);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.7");
    svg.appendChild(path);
    return svg;
}

patch(Form.prototype, {
    get isKmeEnquiry() {
        return this.el.classList.contains("kme-form");
    },

    start() {
        super.start(...arguments);
        if (!this.isKmeEnquiry) {
            return;
        }
        this.kmeFileInput = this.el.querySelector(".kme-file-input");
        this.kmeDropzone = this.el.querySelector(".kme-upload");
        this.kmeFileList = this.el.querySelector(".kme-attachment-list");
        this.kmeFeedback = this.el.querySelector(".kme-upload-feedback");

        // Odoo inserts its own file chips zone before every file input; this
        // form renders its own list instead.
        this.kmeFileInput?.parentNode
            .querySelectorAll(":scope > .o_files_zone")
            .forEach((el) => el.remove());

        this.kmeApplyServiceFromUrl();

        const browseEl = this.el.querySelector(".kme-browse-button");
        if (browseEl && this.kmeFileInput) {
            this.addListener(browseEl, "click", () => this.kmeFileInput.click());
        }
        if (this.kmeDropzone && this.kmeFileInput) {
            for (const name of ["dragenter", "dragover"]) {
                this.addListener(this.kmeDropzone, name, (ev) => {
                    ev.preventDefault();
                    this.kmeDropzone.classList.add("kme-dragging");
                });
            }
            this.addListener(this.kmeDropzone, "dragleave", (ev) => {
                ev.preventDefault();
                if (!this.kmeDropzone.contains(ev.relatedTarget)) {
                    this.kmeDropzone.classList.remove("kme-dragging");
                }
            });
            this.addListener(this.kmeDropzone, "drop", (ev) => {
                ev.preventDefault();
                this.kmeDropzone.classList.remove("kme-dragging");
                if (ev.dataTransfer?.files?.length) {
                    this.kmeAddFiles([...ev.dataTransfer.files]);
                }
            });
        }
        if (this.kmeFileList) {
            this.addListener(this.kmeFileList, "click", (ev) => {
                const buttonEl = ev.target.closest(".kme-file-remove");
                if (buttonEl) {
                    this.kmeRemoveFile(parseInt(buttonEl.dataset.index, 10));
                }
            });
        }
        const clearEl = this.el.querySelector(".kme-clear-button");
        if (clearEl) {
            this.addListener(clearEl, "click", () => this.kmeClear());
        }
    },

    /** Pre-selects a service from ?service=drydocking|afloat|propulsion|structural|other */
    kmeApplyServiceFromUrl() {
        const wanted = (new URLSearchParams(window.location.search).get("service") || "").toLowerCase();
        if (!SERVICE_PARAM_VALUES.includes(wanted)) {
            return;
        }
        const radioEl = this.el.querySelector(`.kme-service-input[data-service="${wanted}"]`);
        if (radioEl) {
            radioEl.checked = true;
        }
    },

    // Files -----------------------------------------------------------------

    kmeCurrentFiles() {
        return this.kmeFileInput?.fileList ? [...this.kmeFileInput.fileList.files] : [];
    },

    kmeSetFiles(files) {
        const transfer = new DataTransfer();
        for (const file of files) {
            transfer.items.add(file);
        }
        // `fileList` is the property Odoo's form uses to track added files.
        this.kmeFileInput.fileList = transfer;
        this.kmeFileInput.files = transfer.files;
        this.kmeRenderFiles();
    },

    kmeAddFiles(incoming) {
        const files = this.kmeCurrentFiles();
        const rejected = [];
        for (const file of incoming) {
            if (!ALLOWED_EXTENSIONS.test(file.name) || file.size > MAX_FILE_SIZE) {
                rejected.push(file.name);
                continue;
            }
            if (!files.some((f) => f.name === file.name && f.size === file.size)) {
                files.push(file);
            }
        }
        this.kmeSetFiles(files);
        this.kmeFeedback.textContent = rejected.length
            ? _t("Not added (unsupported format or over 15 MB):") + "\n" + rejected.join("\n")
            : "";
    },

    kmeRemoveFile(index) {
        const files = this.kmeCurrentFiles();
        const [removed] = files.splice(index, 1);
        this.kmeSetFiles(files);
        if (removed) {
            this.kmeFeedback.textContent = "";
            // Keep keyboard focus inside the upload area.
            const nextButton =
                this.kmeFileList.querySelectorAll(".kme-file-remove")[Math.min(index, files.length - 1)];
            (nextButton || this.el.querySelector(".kme-browse-button"))?.focus();
        }
    },

    kmeRenderFiles() {
        if (!this.kmeFileList) {
            return;
        }
        this.kmeFileList.replaceChildren();
        this.kmeCurrentFiles().forEach((file, index) => {
            const itemEl = document.createElement("li");
            const nameEl = document.createElement("span");
            nameEl.className = "kme-file-name";
            nameEl.append(fileIcon(), document.createTextNode(`${file.name} (${formatSize(file.size)})`));
            const removeEl = document.createElement("button");
            removeEl.type = "button";
            removeEl.className = "kme-file-remove";
            removeEl.dataset.index = String(index);
            removeEl.textContent = _t("Remove");
            removeEl.setAttribute("aria-label", _t("Remove %s", file.name));
            itemEl.append(nameEl, removeEl);
            this.kmeFileList.appendChild(itemEl);
        });
    },

    kmeClear() {
        if (!window.confirm(_t("Clear all entered information and attachments?"))) {
            return;
        }
        this.resetForm();
        for (const el of this.el.querySelectorAll(".o_has_error")) {
            el.classList.remove("o_has_error");
        }
        for (const el of this.el.querySelectorAll(".is-invalid")) {
            el.classList.remove("is-invalid");
            el.removeAttribute("aria-invalid");
        }
        this.el.querySelector("#s_website_form_result")?.replaceChildren();
        this.el.querySelector("#kme_contact_name")?.focus();
    },

    // Overrides of Odoo's form interaction ---------------------------------------

    changeFile(ev) {
        if (!this.isKmeEnquiry || ev.currentTarget !== this.kmeFileInput) {
            return super.changeFile(ev);
        }
        // The input now only holds the latest selection: merge it with the
        // files already added.
        this.kmeAddFiles([...ev.currentTarget.files]);
    },

    isFileInputValid(inputEl) {
        if (!this.isKmeEnquiry || inputEl !== this.kmeFileInput) {
            return super.isFileInputValid(inputEl);
        }
        // Files are checked when added; re-check sizes as a safety net.
        return [...inputEl.files].every(
            (file) => file.size <= MAX_FILE_SIZE && ALLOWED_EXTENSIONS.test(file.name)
        );
    },

    resetForm() {
        super.resetForm(...arguments);
        if (this.isKmeEnquiry && this.kmeFileInput) {
            this.kmeSetFiles([]);
            if (this.kmeFeedback) {
                this.kmeFeedback.textContent = "";
            }
        }
    },

    updateStatus(status, message) {
        if (
            this.isKmeEnquiry &&
            status === "error" &&
            String(message) === String(_t("Please fill in the form correctly."))
        ) {
            message = _t(
                "Please complete the required fields, provide a valid email address, and check the confirmation box."
            );
        }
        return super.updateStatus(status, message);
    },
});
