import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

/**
 * Camera service for photo capture and gallery selection
 * Works with Capacitor on iOS/Android, gracefully degrades on web
 */

export const CameraService = {
  /**
   * Take a photo or select from gallery
   * @param {string} source - 'camera' | 'gallery' | 'prompt' (ask user)
   * @returns {Promise<{dataUrl: string, format: string}>}
   */
  async getPhoto(source = 'prompt') {
    try {
      const sourceMap = {
        camera: CameraSource.Camera,
        gallery: CameraSource.Photos,
        prompt: CameraSource.Prompt
      };

      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: sourceMap[source] || CameraSource.Prompt,
        width: 1200,
        height: 1200,
        correctOrientation: true
      });

      return {
        dataUrl: image.dataUrl,
        format: image.format || 'jpeg'
      };
    } catch (error) {
      if (error.message?.includes('User cancelled')) {
        return null; // User cancelled - not an error
      }
      console.error('Camera error:', error);
      throw error;
    }
  },

  /**
   * Check if camera permissions are granted
   */
  async checkPermissions() {
    try {
      const status = await Camera.checkPermissions();
      return status;
    } catch {
      return { camera: 'prompt', photos: 'prompt' };
    }
  },

  /**
   * Request camera permissions
   */
  async requestPermissions() {
    try {
      const status = await Camera.requestPermissions();
      return status;
    } catch {
      return { camera: 'denied', photos: 'denied' };
    }
  },

  /**
   * Convert dataUrl to a File/Blob for upload
   */
  dataUrlToBlob(dataUrl) {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }
};

export default CameraService;
