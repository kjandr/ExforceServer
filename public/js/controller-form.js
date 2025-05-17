class ControllerForm {
    constructor() {
        this.form = document.querySelector('.edit-form');
        this.typeSelect = document.getElementById('type');
        this.formContent = document.getElementById('form-content');

        this.init();
    }

    init() {
        if (this.typeSelect) {
            this.typeSelect.addEventListener('change', () => this.handleTypeChange());
        }
    }

    async handleTypeChange() {
        const selectedType = this.typeSelect.value;
        if (selectedType === 'none') {
            this.formContent.innerHTML = '';
            return;
        }

        try {
            const response = await fetch(`/admin/controller/preset/${selectedType}`);
            if (!response.ok) throw new Error('Fehler beim Laden der Preset-Daten');

            const preset = await response.json();
            this.renderForm(preset);
        } catch (error) {
            console.error('Fehler:', error);
            this.formContent.innerHTML = '<p class="error">Fehler beim Laden der Controller-Daten</p>';
        }
    }

    renderForm(preset) {
        this.formContent.innerHTML = Object.entries(preset)
            .map(([key, field]) => this.createFormField(key, field))
            .join('');
    }

    createFormField(key, field) {
        const label = field.label || key;
        const unit = field.unit ? ` (${field.unit})` : '';
        const required = field.required ? 'required' : '';

        let input;
        if (field.type === 'checkbox') {
            input = `<input type="checkbox" 
                            id="${key}" 
                            name="${key}"
                            ${field.value ? 'checked' : ''}
                            ${required}>`;
        } else {
            input = `<input type="${field.type}"
                            id="${key}"
                            name="${key}"
                            value="${field.value}"
                            ${field.step ? `step="${field.step}"` : ''}
                            ${required}>`;
        }

        return `
            <div class="form-group">
                <label for="${key}">${label}${unit}:</label>
                ${input}
            </div>
        `;
    }
}

// Initialisierung beim Laden der Seite
document.addEventListener('DOMContentLoaded', () => {
    new ControllerForm();
});
