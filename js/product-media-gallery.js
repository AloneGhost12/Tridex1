/**
 * Product Media Gallery Manager
 *
 * This module provides functionality for managing product media galleries,
 * including multiple image uploads, video uploads, and media organization.
 */

class ProductMediaGallery {
    constructor(options = {}) {
        // DOM elements
        this.container = options.container || document.getElementById('media-gallery-container');
        this.mediaPreviewContainer = options.mediaPreviewContainer || document.getElementById('media-preview-container');
        this.mediaInput = options.mediaInput || document.getElementById('media-file-input');
        this.videoUrlInput = options.videoUrlInput || document.getElementById('video-url-input');
        this.addVideoBtn = options.addVideoBtn || document.getElementById('add-video-btn');

        // Configuration
        this.cloudName = options.cloudName || 'dtzhskby3';
        this.uploadPreset = options.uploadPreset || 'tridex_products';
        this.apiKey = options.apiKey || '';
        this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB default
        this.allowedImageTypes = options.allowedImageTypes || ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        this.allowedVideoTypes = options.allowedVideoTypes || ['video/mp4', 'video/quicktime', 'video/webm'];

        // State
        this.mediaItems = options.initialMedia || [];
        this.uploadQueue = [];
        this.isUploading = false;

        // Callbacks
        this.onMediaChange = options.onMediaChange || function() {};
        this.onUploadStart = options.onUploadStart || function() {};
        this.onUploadProgress = options.onUploadProgress || function() {};
        this.onUploadComplete = options.onUploadComplete || function() {};
        this.onUploadError = options.onUploadError || function() {};

        // Initialize
        this.init();
    }

    /**
     * Initialize the gallery
     */
    init() {
        // Set up event listeners
        if (this.mediaInput) {
            this.mediaInput.addEventListener('change', this.handleFileSelect.bind(this));
        }

        if (this.addVideoBtn && this.videoUrlInput) {
            this.addVideoBtn.addEventListener('click', this.handleVideoUrlAdd.bind(this));
        }

        // Render initial media if any
        this.renderMediaPreviews();
    }

    /**
     * Handle file selection from input
     * @param {Event} event - The change event
     */
    handleFileSelect(event) {
        const files = Array.from(event.target.files);

        if (files.length === 0) return;

        // Filter files by type and size
        const validFiles = files.filter(file => {
            // Check file size
            if (file.size > this.maxFileSize) {
                this.showNotification(`File ${file.name} exceeds the maximum size limit of ${Math.round(this.maxFileSize/1024/1024)}MB`, 'error');
                return false;
            }

            // Check file type
            if (this.allowedImageTypes.includes(file.type) || this.allowedVideoTypes.includes(file.type)) {
                return true;
            } else {
                this.showNotification(`File type ${file.type} is not supported`, 'error');
                return false;
            }
        });

        // Add valid files to upload queue
        this.addFilesToUploadQueue(validFiles);

        // Clear the input to allow selecting the same files again
        event.target.value = '';
    }

    /**
     * Handle adding a video URL
     */
    handleVideoUrlAdd() {
        const videoUrl = this.videoUrlInput.value.trim();

        if (!videoUrl) {
            this.showNotification('Please enter a video URL', 'error');
            return;
        }

        // Validate URL format
        if (!this.isValidUrl(videoUrl)) {
            this.showNotification('Please enter a valid URL', 'error');
            return;
        }

        // Add video to media items
        this.addVideoUrl(videoUrl);

        // Clear the input
        this.videoUrlInput.value = '';
    }

    /**
     * Add files to the upload queue and start uploading
     * @param {Array} files - Array of File objects
     */
    addFilesToUploadQueue(files) {
        // Add files to queue
        this.uploadQueue.push(...files);

        // Start uploading if not already in progress
        if (!this.isUploading) {
            this.processUploadQueue();
        }
    }

    /**
     * Process the upload queue
     */
    async processUploadQueue() {
        if (this.uploadQueue.length === 0) {
            this.isUploading = false;
            return;
        }

        this.isUploading = true;

        // Get the next file
        const file = this.uploadQueue.shift();

        // Determine if it's an image or video
        const isVideo = this.allowedVideoTypes.includes(file.type);

        try {
            // Show upload status
            this.onUploadStart(file);
            this.showNotification(`Uploading ${isVideo ? 'video' : 'image'}: ${file.name}`, 'info');

            // Upload to Cloudinary
            const mediaUrl = await this.uploadToCloudinary(file, isVideo);

            // Add to media items
            if (isVideo) {
                this.addVideo({
                    url: mediaUrl.url,
                    thumbnailUrl: mediaUrl.thumbnailUrl,
                    publicId: mediaUrl.publicId
                });
            } else {
                this.addImage({
                    url: mediaUrl.url,
                    publicId: mediaUrl.publicId
                });
            }

            // Show success message
            this.showNotification(`${isVideo ? 'Video' : 'Image'} uploaded successfully`, 'success');
            this.onUploadComplete(file, mediaUrl);

            // Process next file
            this.processUploadQueue();
        } catch (error) {
            console.error('Upload error:', error);
            this.showNotification(`Error uploading ${file.name}: ${error.message}`, 'error');
            this.onUploadError(file, error);

            // Continue with next file
            this.processUploadQueue();
        }
    }

    /**
     * Upload a file to Cloudinary
     * @param {File} file - The file to upload
     * @param {boolean} isVideo - Whether the file is a video
     * @returns {Promise<Object>} - The upload result with URL
     */
    async uploadToCloudinary(file, isVideo = false) {
        return new Promise(async (resolve, reject) => {
            try {
                // Create form data
                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', this.uploadPreset);
                formData.append('folder', 'product_media');

                // For videos, we might need to use signed uploads
                if (isVideo && file.size > 10 * 1024 * 1024) {
                    try {
                        // Get signature from server
                        const signatureResponse = await fetch('https://tridex1.onrender.com/cloudinary-signature');
                        if (signatureResponse.ok) {
                            const signatureData = await signatureResponse.json();
                            formData.append('signature', signatureData.signature);
                            formData.append('timestamp', signatureData.timestamp);
                            formData.append('api_key', this.apiKey);
                        }
                    } catch (error) {
                        console.warn('Could not get signature for video upload, trying unsigned upload', error);
                    }
                }

                // Upload resource type (image or video)
                const resourceType = isVideo ? 'video' : 'image';

                // Upload to Cloudinary
                const response = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/${resourceType}/upload`, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Cloudinary upload failed: ${errorText}`);
                }

                const data = await response.json();

                // Return the URL and other relevant data
                resolve({
                    url: data.secure_url,
                    thumbnailUrl: isVideo ? data.thumbnail_url || null : null,
                    publicId: data.public_id
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Add an image to the media items
     * @param {Object} imageData - The image data
     */
    addImage(imageData) {
        const newMedia = {
            type: 'image',
            url: imageData.url,
            publicId: imageData.publicId,
            order: this.mediaItems.length,
            isPrimary: this.mediaItems.length === 0, // First image is primary by default
            altText: '',
            caption: ''
        };

        this.mediaItems.push(newMedia);
        this.renderMediaPreviews();
        this.onMediaChange(this.mediaItems);
    }

    /**
     * Add a video to the media items
     * @param {Object} videoData - The video data
     */
    addVideo(videoData) {
        const newMedia = {
            type: 'video',
            url: videoData.url,
            thumbnailUrl: videoData.thumbnailUrl,
            publicId: videoData.publicId,
            order: this.mediaItems.length,
            isPrimary: false, // Videos are not primary by default
            altText: '',
            caption: ''
        };

        this.mediaItems.push(newMedia);
        this.renderMediaPreviews();
        this.onMediaChange(this.mediaItems);
    }

    /**
     * Add a video from URL
     * @param {string} videoUrl - The video URL
     */
    addVideoUrl(videoUrl) {
        // For external videos, we don't have a thumbnail or public ID
        const newMedia = {
            type: 'video',
            url: videoUrl,
            thumbnailUrl: null,
            publicId: null,
            order: this.mediaItems.length,
            isPrimary: false,
            altText: '',
            caption: ''
        };

        this.mediaItems.push(newMedia);
        this.renderMediaPreviews();
        this.onMediaChange(this.mediaItems);

        this.showNotification('Video added successfully', 'success');
    }

    /**
     * Remove a media item
     * @param {number} index - The index of the media item to remove
     */
    removeMedia(index) {
        if (index < 0 || index >= this.mediaItems.length) return;

        const removedItem = this.mediaItems.splice(index, 1)[0];

        // If we removed the primary item, set a new primary
        if (removedItem.isPrimary && this.mediaItems.length > 0) {
            // Find the first image to set as primary
            const firstImage = this.mediaItems.find(item => item.type === 'image');
            if (firstImage) {
                firstImage.isPrimary = true;
            }
        }

        // Update order of remaining items
        this.mediaItems.forEach((item, i) => {
            item.order = i;
        });

        this.renderMediaPreviews();
        this.onMediaChange(this.mediaItems);
    }

    /**
     * Set a media item as primary
     * @param {number} index - The index of the media item to set as primary
     */
    setPrimaryMedia(index) {
        if (index < 0 || index >= this.mediaItems.length) return;

        // Only images can be primary
        if (this.mediaItems[index].type !== 'image') {
            this.showNotification('Only images can be set as primary', 'error');
            return;
        }

        // Unset all other items
        this.mediaItems.forEach(item => {
            item.isPrimary = false;
        });

        // Set the selected item as primary
        this.mediaItems[index].isPrimary = true;

        this.renderMediaPreviews();
        this.onMediaChange(this.mediaItems);
    }

    /**
     * Render media previews
     */
    renderMediaPreviews() {
        if (!this.mediaPreviewContainer) return;

        // Clear container
        this.mediaPreviewContainer.innerHTML = '';

        // If no media, show placeholder
        if (this.mediaItems.length === 0) {
            this.mediaPreviewContainer.innerHTML = `
                <div class="media-placeholder">
                    <i class="fas fa-images"></i>
                    <p>No media added yet</p>
                </div>
            `;
            return;
        }

        // Sort media by order
        const sortedMedia = [...this.mediaItems].sort((a, b) => a.order - b.order);

        // Create preview elements
        sortedMedia.forEach((media, index) => {
            const mediaElement = document.createElement('div');
            mediaElement.className = `media-preview-item ${media.isPrimary ? 'primary' : ''}`;
            mediaElement.dataset.index = index;

            if (media.type === 'image') {
                mediaElement.innerHTML = `
                    <div class="media-preview-image">
                        <img src="${media.url}" alt="${media.altText || 'Product image'}">
                        ${media.isPrimary ? '<div class="primary-badge">Primary</div>' : ''}
                    </div>
                    <div class="media-preview-controls">
                        <button type="button" class="set-primary-btn" title="Set as primary image">
                            <i class="fas fa-star"></i>
                        </button>
                        <button type="button" class="remove-media-btn" title="Remove image">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
            } else if (media.type === 'video') {
                mediaElement.innerHTML = `
                    <div class="media-preview-video">
                        ${media.thumbnailUrl ?
                            `<img src="${media.thumbnailUrl}" alt="Video thumbnail">` :
                            `<div class="video-placeholder"><i class="fas fa-video"></i></div>`
                        }
                        <div class="video-badge"><i class="fas fa-play"></i></div>
                    </div>
                    <div class="media-preview-controls">
                        <button type="button" class="remove-media-btn" title="Remove video">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
            }

            // Add event listeners
            const setPrimaryBtn = mediaElement.querySelector('.set-primary-btn');
            if (setPrimaryBtn) {
                setPrimaryBtn.addEventListener('click', () => this.setPrimaryMedia(index));
            }

            const removeBtn = mediaElement.querySelector('.remove-media-btn');
            if (removeBtn) {
                removeBtn.addEventListener('click', () => this.removeMedia(index));
            }

            this.mediaPreviewContainer.appendChild(mediaElement);
        });
    }

    /**
     * Show a notification message
     * @param {string} message - The message to show
     * @param {string} type - The type of notification (info, success, error)
     */
    showNotification(message, type = 'info') {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('media-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'media-notification';
            document.body.appendChild(notification);
        }

        // Set notification content and type
        notification.className = `media-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="close-notification"><i class="fas fa-times"></i></button>
        `;

        // Show notification
        notification.style.display = 'block';

        // Add close button event listener
        const closeBtn = notification.querySelector('.close-notification');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                notification.style.display = 'none';
            });
        }

        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (notification) {
                notification.style.display = 'none';
            }
        }, 5000);
    }

    /**
     * Check if a string is a valid URL
     * @param {string} url - The URL to validate
     * @returns {boolean} - Whether the URL is valid
     */
    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Get all media items
     * @returns {Array} - The media items
     */
    getMediaItems() {
        return this.mediaItems;
    }

    /**
     * Set media items
     * @param {Array} items - The media items to set
     */
    setMediaItems(items) {
        this.mediaItems = Array.isArray(items) ? [...items] : [];
        this.renderMediaPreviews();

        // Call onMediaChange callback
        this.onMediaChange(this.mediaItems);
    }
}

// Export the class
window.ProductMediaGallery = ProductMediaGallery;
