// Notification service to manage "Teto misses you" notification
export const notificationService = {
  STORAGE_KEY: 'tetoNotificationEnabled',

  isEnabled() {
    const stored = localStorage.getItem(this.STORAGE_KEY)
    // Default to true if not set
    return stored === null ? true : stored === 'true'
  },

  enable() {
    localStorage.setItem(this.STORAGE_KEY, 'true')
  },

  disable() {
    localStorage.setItem(this.STORAGE_KEY, 'false')
  },

  toggle() {
    if (this.isEnabled()) {
      this.disable()
    } else {
      this.enable()
    }
  }
}