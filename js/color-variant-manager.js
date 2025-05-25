/**
 * Color Variant Manager
 *
 * This module provides functionality for managing product color variants
 * in the admin panel.
 *
 * Version: 2.0 - Native JavaScript Modal (No jQuery)
 * Last Updated: 2024
 */

console.log('ColorVariantManager v2.0 loaded - Native JavaScript Modal');

class ColorVariantManager {
    /**
     * Initialize the color variant manager
     * @param {Object} options Configuration options
     */
    constructor(options = {}) {
        // Container for the color variant UI
        this.container = options.container || document.getElementById('color-variant-container');

        // Parent product ID
        this.parentProductId = options.parentProductId || null;

        // Callback when variants change
        this.onVariantsChange = options.onVariantsChange || function() {};

        // Cloudinary configuration
        this.cloudName = options.cloudName || '';
        this.apiKey = options.apiKey || '';

        // Array of color variants
        this.variants = [];

        // Standard color options
        this.standardColors = [
            { name: 'Black', hexCode: '#000000' },
            { name: 'White', hexCode: '#FFFFFF' },
            { name: 'Red', hexCode: '#FF0000' },
            { name: 'Green', hexCode: '#008000' },
            { name: 'Blue', hexCode: '#0000FF' },
            { name: 'Yellow', hexCode: '#FFFF00' },
            { name: 'Purple', hexCode: '#800080' },
            { name: 'Orange', hexCode: '#FFA500' },
            { name: 'Pink', hexCode: '#FFC0CB' },
            { name: 'Gray', hexCode: '#808080' },
            { name: 'Brown', hexCode: '#A52A2A' },
            { name: 'Navy Blue', hexCode: '#000080' },
            { name: 'Teal', hexCode: '#008080' },
            { name: 'Gold', hexCode: '#FFD700' },
            { name: 'Silver', hexCode: '#C0C0C0' }
        ];

        // Initialize the UI
        console.log('ColorVariantManager: Initializing UI with container:', this.container);
        this.initUI();
    }

    /**
     * Initialize the user interface
     */
    initUI() {
        console.log('ColorVariantManager: initUI called');
        if (!this.container) {
            console.error('Color variant container not found');
            return;
        }
        console.log('ColorVariantManager: Container found, creating UI elements');

        // Hide the container initially (will be shown when a product is selected)
        this.container.style.display = 'none';

        // Create the UI elements
        this.container.innerHTML = `
            <div class="color-variant-manager">
                <h3>Color Variants</h3>
                <div class="color-variant-controls">
                    <button type="button" id="add-variant-btn" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Add Color Variant
                    </button>
                </div>
                <div class="color-variants-list" id="color-variants-list">
                    <div class="no-variants-message">No color variants added yet.</div>
                </div>
            </div>

            <!-- Color Variant Modal -->
            <div id="colorVariantModal" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.3); z-index:3000; align-items:center; justify-content:center;">
                <div style="background:#fff; padding:32px 24px; border-radius:8px; box-shadow:0 2px 12px rgba(0,0,0,0.15); min-width:600px; max-width:90vw; max-height:90vh; overflow-y:auto;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid #eee; padding-bottom:15px;">
                        <h2 id="colorVariantModalLabel" style="margin:0; color:#333;">Add Color Variant</h2>
                        <button type="button" id="close-variant-modal" style="background:none; border:none; font-size:24px; cursor:pointer; color:#999; padding:0; width:30px; height:30px; display:flex; align-items:center; justify-content:center;">
                            &times;
                        </button>
                    </div>
                    <div>
                            <form id="color-variant-form">
                                <div class="form-group">
                                    <label for="variant-color">Color</label>
                                    <select id="variant-color" class="form-control" required>
                                        <option value="">-- Select Color --</option>
                                        ${this.standardColors.map(color =>
                                            `<option value="${color.name}" data-hex="${color.hexCode}">${color.name}</option>`
                                        ).join('')}
                                        <option value="custom">Custom Color...</option>
                                    </select>
                                </div>

                                <div id="custom-color-fields" style="display: none;">
                                    <div class="form-group">
                                        <label for="custom-color-name">Custom Color Name</label>
                                        <input type="text" id="custom-color-name" class="form-control" placeholder="e.g., Midnight Blue">
                                    </div>
                                    <div class="form-group">
                                        <label for="custom-color-hex">Color Code (Hex)</label>
                                        <input type="color" id="custom-color-hex" class="form-control" value="#0000FF">
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label for="variant-price">Price (leave empty to use parent price)</label>
                                    <input type="number" id="variant-price" class="form-control" min="0" step="0.01">
                                </div>

                                <div class="form-group">
                                    <label for="variant-inventory">Inventory Quantity</label>
                                    <input type="number" id="variant-inventory" class="form-control" min="0" value="0">
                                </div>

                                <div class="form-group">
                                    <div class="custom-control custom-checkbox">
                                        <input type="checkbox" class="custom-control-input" id="variant-in-stock" checked>
                                        <label class="custom-control-label" for="variant-in-stock">In Stock</label>
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label>Color-specific Images</label>
                                    <div id="variant-media-gallery"></div>
                                </div>
                            </form>
                        </div>
                        <div style="margin-top:20px; padding-top:15px; border-top:1px solid #eee; display:flex; justify-content:flex-end; gap:10px;">
                            <button type="button" id="cancel-variant-btn" style="padding:8px 18px; background:#6c757d; color:#fff; border:none; border-radius:5px; font-size:1rem; cursor:pointer;">Cancel</button>
                            <button type="button" id="save-variant-btn" style="padding:8px 18px; background:#007bff; color:#fff; border:none; border-radius:5px; font-size:1rem; cursor:pointer;">Save Color Variant</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners
        document.getElementById('add-variant-btn').addEventListener('click', () => this.openVariantModal());
        document.getElementById('variant-color').addEventListener('change', this.handleColorSelectChange.bind(this));
        document.getElementById('save-variant-btn').addEventListener('click', this.saveVariant.bind(this));

        // Add modal close event listeners
        document.getElementById('close-variant-modal').addEventListener('click', this.closeVariantModal.bind(this));
        document.getElementById('cancel-variant-btn').addEventListener('click', this.closeVariantModal.bind(this));

        // Initialize the media gallery for variants
        this.initVariantMediaGallery();
    }

    /**
     * Initialize the media gallery for variant images
     */
    initVariantMediaGallery() {
        // This will be initialized when the modal is opened
        this.variantMediaGallery = null;
    }

    /**
     * Handle color select change
     */
    handleColorSelectChange(event) {
        const colorSelect = event.target;
        const customFieldsContainer = document.getElementById('custom-color-fields');

        if (colorSelect.value === 'custom') {
            customFieldsContainer.style.display = 'block';
        } else {
            customFieldsContainer.style.display = 'none';

            // Set the hex color from the selected option
            const selectedOption = colorSelect.options[colorSelect.selectedIndex];
            const hexCode = selectedOption.getAttribute('data-hex');

            if (hexCode) {
                document.getElementById('custom-color-hex').value = hexCode;
            }
        }
    }

    /**
     * Open the variant modal for adding/editing a variant
     * @param {Object} variant Existing variant to edit (optional)
     */
    openVariantModal(variant = null) {
        // Set modal title based on whether we're adding or editing
        const modalTitle = document.getElementById('colorVariantModalLabel');
        if (modalTitle) {
            modalTitle.textContent = variant ? 'Edit Color Variant' : 'Add Color Variant';
        }

        // Reset the form (check if it exists first)
        const form = document.getElementById('color-variant-form');
        if (form) {
            form.reset();
        }

        // Initialize the media gallery if not already done
        if (!this.variantMediaGallery) {
            // Get Cloudinary configuration
            try {
                getCloudinaryConfig().then(cloudinaryConfig => {
                    console.log('Initializing variant media gallery with config:', cloudinaryConfig);
                    const galleryContainer = document.getElementById('variant-media-gallery');

                    if (!galleryContainer) {
                        console.error('Variant media gallery container not found');
                        return;
                    }

                    this.variantMediaGallery = new ProductMediaGallery({
                        container: galleryContainer,
                        cloudName: cloudinaryConfig.cloudName,
                        apiKey: cloudinaryConfig.apiKey,
                        initialMedia: variant && variant.media ? variant.media : []
                    });
                    console.log('Variant media gallery initialized successfully');
                }).catch(error => {
                    console.error('Failed to get Cloudinary config for variant gallery:', error);
                });
            } catch (error) {
                console.error('Error initializing variant media gallery:', error);
            }
        } else {
            // Reset the media gallery with variant media if editing
            console.log('Resetting variant media gallery with media:', variant && variant.media ? variant.media : []);
            this.variantMediaGallery.setMediaItems(variant && variant.media ? variant.media : []);
        }

        // If editing, populate the form with variant data
        if (variant) {
            // Store the variant ID for updating
            this.editingVariantId = variant._id;

            // Set color (check if elements exist)
            const colorSelect = document.getElementById('variant-color');
            const customColorName = document.getElementById('custom-color-name');
            const customColorHex = document.getElementById('custom-color-hex');

            if (!colorSelect || !customColorName || !customColorHex) {
                console.error('Color variant form elements not found');
                return;
            }

            // Check if the color is in our standard colors
            const standardColor = this.standardColors.find(c =>
                c.name.toLowerCase() === variant.color.name.toLowerCase());

            if (standardColor) {
                colorSelect.value = standardColor.name;
                customColorName.value = '';
                customColorHex.value = standardColor.hexCode;
                document.getElementById('custom-color-fields').style.display = 'none';
            } else {
                colorSelect.value = 'custom';
                customColorName.value = variant.color.name;
                customColorHex.value = variant.color.hexCode;
                document.getElementById('custom-color-fields').style.display = 'block';
            }

            // Set price and inventory (check if elements exist)
            const priceInput = document.getElementById('variant-price');
            const inventoryInput = document.getElementById('variant-inventory');
            const inStockCheckbox = document.getElementById('variant-in-stock');

            if (priceInput) {
                priceInput.value = variant.price || '';
            }
            if (inventoryInput) {
                inventoryInput.value = variant.inventory && variant.inventory.quantity !== undefined ?
                    variant.inventory.quantity : 0;
            }
            if (inStockCheckbox) {
                inStockCheckbox.checked = variant.inventory ? variant.inventory.inStock : true;
            }
        } else {
            // Clear editing variant ID
            this.editingVariantId = null;
        }

        // Show the modal using native JavaScript
        const modal = document.getElementById('colorVariantModal');
        console.log('Looking for modal element:', modal);
        console.log('All elements with colorVariantModal:', document.querySelectorAll('#colorVariantModal'));

        if (modal) {
            console.log('Modal found, showing it');
            modal.style.display = 'flex';
        } else {
            console.error('Color variant modal not found - checking if UI was initialized');
            console.log('Container exists:', !!this.container);
            console.log('Container innerHTML length:', this.container ? this.container.innerHTML.length : 'N/A');
        }
    }

    /**
     * Close the variant modal
     */
    closeVariantModal() {
        const modal = document.getElementById('colorVariantModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Save the current variant
     */
    async saveVariant() {
        try {
            // Validate parent product ID first
            if (!this.parentProductId) {
                alert('No parent product selected. Please select a product first.');
                return;
            }

            // Validate that parent product ID looks like a valid MongoDB ObjectId
            if (!/^[0-9a-fA-F]{24}$/.test(this.parentProductId)) {
                console.error('Invalid parent product ID format:', this.parentProductId);
                alert('Invalid product ID. Please refresh the page and try again.');
                return;
            }

            console.log('Validated parent product ID:', this.parentProductId);

            // Get form values
            const colorSelect = document.getElementById('variant-color');
            const customColorName = document.getElementById('custom-color-name');
            const customColorHex = document.getElementById('custom-color-hex');
            const priceInput = document.getElementById('variant-price');
            const inventoryInput = document.getElementById('variant-inventory');
            const inStockCheckbox = document.getElementById('variant-in-stock');

            // Validate that all form elements exist
            if (!colorSelect || !customColorName || !customColorHex || !priceInput || !inventoryInput || !inStockCheckbox) {
                console.error('Some form elements are missing');
                alert('Form is not properly loaded. Please refresh the page and try again.');
                return;
            }

            // Validate color selection
            if (colorSelect.value === '') {
                alert('Please select a color');
                return;
            }

            if (colorSelect.value === 'custom' && !customColorName.value.trim()) {
                alert('Please enter a custom color name');
                return;
            }

            // Prepare color data
            const colorData = {
                name: colorSelect.value === 'custom' ? customColorName.value.trim() : colorSelect.value,
                hexCode: colorSelect.value === 'custom' ?
                    customColorHex.value :
                    colorSelect.options[colorSelect.selectedIndex].getAttribute('data-hex')
            };

            // Prepare inventory data
            const inventoryData = {
                quantity: parseInt(inventoryInput.value) || 0,
                inStock: inStockCheckbox.checked
            };

            // Prepare media data
            let mediaItems = [];
            if (this.variantMediaGallery) {
                try {
                    mediaItems = this.variantMediaGallery.getMediaItems() || [];
                    console.log('Retrieved media items from gallery:', mediaItems);
                } catch (error) {
                    console.error('Error getting media items from gallery:', error);
                    mediaItems = [];
                }
            } else {
                console.log('Variant media gallery not initialized, no media items');
            }

            // Prepare variant data
            const variantData = {
                color: colorData,
                price: priceInput.value ? parseFloat(priceInput.value) : undefined,
                inventory: inventoryData,
                media: mediaItems
            };

            // If editing, update the variant
            if (this.editingVariantId) {
                const apiUrl = 'https://tridex1.onrender.com';
                const fullUrl = `${apiUrl}/products/${this.parentProductId}/variants/${this.editingVariantId}`;

                const response = await fetch(fullUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(variantData)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Failed to update variant: ${response.status} ${response.statusText} - ${errorText}`);
                }

                const result = await response.json();

                // Update the variant in the local array
                const index = this.variants.findIndex(v => v._id === this.editingVariantId);
                if (index !== -1) {
                    this.variants[index] = result.variant;
                }

                alert('Color variant updated successfully');
            } else {
                // Create a new variant
                console.log('Creating variant with data:', variantData);
                console.log('Parent product ID:', this.parentProductId);

                const apiUrl = 'https://tridex1.onrender.com';
                const fullUrl = `${apiUrl}/products/${this.parentProductId}/variants`;
                console.log('Making request to:', fullUrl);

                const response = await fetch(fullUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(variantData)
                });

                console.log('Response status:', response.status);
                console.log('Response headers:', response.headers);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Server error response:', errorText);
                    throw new Error(`Failed to create variant: ${response.status} ${response.statusText} - ${errorText}`);
                }

                const result = await response.json();

                // Add the new variant to the local array
                this.variants.push(result.variant);

                alert('Color variant added successfully');
            }

            // Close the modal
            this.closeVariantModal();

            // Refresh the variants list
            this.renderVariantsList();

            // Notify of changes
            this.onVariantsChange(this.variants);
        } catch (error) {
            console.error('Error saving variant:', error);
            alert(`Error: ${error.message}`);
        }
    }

    /**
     * Set the parent product ID
     * @param {string} productId The parent product ID
     */
    setParentProductId(productId) {
        console.log('ColorVariantManager: Setting parent product ID to:', productId);
        this.parentProductId = productId;

        // Show/hide the variant manager based on whether we have a product
        if (this.container) {
            if (productId) {
                this.container.style.display = 'block';
                console.log('ColorVariantManager: Showing variant manager for product:', productId);
            } else {
                this.container.style.display = 'none';
                console.log('ColorVariantManager: Hiding variant manager (no product selected)');
            }
        }

        // Load variants for this product
        if (productId) {
            this.loadVariants();
        } else {
            this.variants = [];
            this.renderVariantsList();
        }
    }

    /**
     * Load variants for the current parent product
     */
    async loadVariants() {
        if (!this.parentProductId) {
            console.error('No parent product ID set');
            return;
        }

        try {
            const apiUrl = 'https://tridex1.onrender.com';
            const fullUrl = `${apiUrl}/products/${this.parentProductId}/variants`;

            const response = await fetch(fullUrl);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to load variants: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            this.variants = data.variants || [];

            // Render the variants list
            this.renderVariantsList();

            // Notify of changes
            this.onVariantsChange(this.variants);
        } catch (error) {
            console.error('Error loading variants:', error);
            this.variants = [];
            this.renderVariantsList();
        }
    }

    /**
     * Render the list of variants
     */
    renderVariantsList() {
        const listContainer = document.getElementById('color-variants-list');

        if (!listContainer) {
            console.error('Variants list container not found');
            return;
        }

        if (this.variants.length === 0) {
            listContainer.innerHTML = '<div class="no-variants-message">No color variants added yet.</div>';
            return;
        }

        // Sort variants by color name
        const sortedVariants = [...this.variants].sort((a, b) =>
            a.color.name.localeCompare(b.color.name));

        // Generate HTML for each variant
        const variantsHtml = sortedVariants.map(variant => `
            <div class="color-variant-item" data-id="${variant._id}">
                <div class="color-swatch" style="background-color: ${variant.color.hexCode}"></div>
                <div class="variant-details">
                    <div class="variant-name">${variant.color.name}</div>
                    <div class="variant-price">₹${variant.price}</div>
                    <div class="variant-inventory">
                        Stock: ${variant.inventory ? variant.inventory.quantity : 0}
                        (${variant.inventory && variant.inventory.inStock ? 'In Stock' : 'Out of Stock'})
                    </div>
                </div>
                <div class="variant-actions">
                    <button type="button" class="btn btn-sm btn-outline-primary edit-variant-btn">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-danger delete-variant-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Update the container
        listContainer.innerHTML = variantsHtml;

        // Add event listeners to the buttons
        listContainer.querySelectorAll('.edit-variant-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const variantId = event.target.closest('.color-variant-item').dataset.id;
                const variant = this.variants.find(v => v._id === variantId);
                if (variant) {
                    this.openVariantModal(variant);
                }
            });
        });

        listContainer.querySelectorAll('.delete-variant-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const variantId = event.target.closest('.color-variant-item').dataset.id;
                const variant = this.variants.find(v => v._id === variantId);
                if (variant && confirm(`Are you sure you want to delete the ${variant.color.name} variant?`)) {
                    this.deleteVariant(variantId);
                }
            });
        });
    }

    /**
     * Delete a variant
     * @param {string} variantId The ID of the variant to delete
     */
    async deleteVariant(variantId) {
        if (!this.parentProductId || !variantId) {
            console.error('Missing parent product ID or variant ID');
            return;
        }

        try {
            const apiUrl = 'https://tridex1.onrender.com';
            const fullUrl = `${apiUrl}/products/${this.parentProductId}/variants/${variantId}`;

            const response = await fetch(fullUrl, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to delete variant: ${response.status} ${response.statusText} - ${errorText}`);
            }

            // Remove the variant from the local array
            this.variants = this.variants.filter(v => v._id !== variantId);

            // Render the updated list
            this.renderVariantsList();

            // Notify of changes
            this.onVariantsChange(this.variants);

            alert('Color variant deleted successfully');
        } catch (error) {
            console.error('Error deleting variant:', error);
            alert(`Error: ${error.message}`);
        }
    }

    /**
     * Get all variants
     * @returns {Array} The array of variants
     */
    getVariants() {
        return this.variants;
    }
}
