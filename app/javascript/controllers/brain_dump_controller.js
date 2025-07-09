import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "modal", 
    "form", 
    "textarea", 
    "errors", 
    "submitButton"
  ]
  
  static values = {
    url: String
  }

  connect() {
    // Initialize modal state
    this.closeModal()
  }

  // Open modal
  openModal(event) {
    event.preventDefault()
    this.modalTarget.classList.add('show')
    this.clearErrors()
    
    // Focus on textarea after animation
    setTimeout(() => {
      this.textareaTarget.focus()
    }, 100)
  }

  // Close modal
  closeModal() {
    this.modalTarget.classList.remove('show')
    this.textareaTarget.value = ''
    this.clearErrors()
  }

  // Handle clicking outside modal
  handleBackdropClick(event) {
    if (event.target === this.modalTarget) {
      this.closeModal()
    }
  }

  // Handle escape key
  handleKeydown(event) {
    if (event.key === 'Escape' && this.modalTarget.classList.contains('show')) {
      this.closeModal()
    }
  }

  // Submit form via Ajax
  async submitForm(event) {
    event.preventDefault()

    const textareaValue = this.textareaTarget.value.trim()
    if (!textareaValue) {
      this.showError('Please enter some text to create tasks from.')
      this.textareaTarget.focus()
      return
    }

    this.clearErrors()
    this.setSubmitButtonState(true, 'Creating...')

    try {
      const formData = new FormData(this.formTarget)
      const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content')

      const response = await fetch(this.urlValue, {
        method: 'POST',
        body: formData,
        headers: {
          'X-CSRF-Token': csrfToken,
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      })

      const data = await response.json()

      if (data.success) {
        this.handleSuccess(data)
      } else {
        this.showError(data.error || 'An error occurred while creating tasks.')
      }
    } catch (error) {
      console.error('Error:', error)
      this.showError('An error occurred while creating tasks. Please try again.')
    } finally {
      this.setSubmitButtonState(false, 'Create Tasks')
    }
  }

  // Clear error messages
  clearErrors() {
    if (this.hasErrorsTarget) {
      this.errorsTarget.style.display = 'none'
      this.errorsTarget.innerHTML = ''
    }
  }

  // Show error message
  showError(message) {
    if (this.hasErrorsTarget) {
      this.errorsTarget.innerHTML = `<div class="error-message">${message}</div>`
      this.errorsTarget.style.display = 'block'
    }
  }

  // Handle successful submission
  handleSuccess(data) {
    this.closeModal()
    
    // Create and show flash message
    const flashMessage = document.createElement('div')
    flashMessage.className = 'notice'
    flashMessage.textContent = data.message
    
    const mainContent = document.querySelector('.main-content')
    if (mainContent) {
      mainContent.insertBefore(flashMessage, mainContent.firstChild)
      
      // Auto-remove flash message after 5 seconds
      setTimeout(() => {
        flashMessage.remove()
      }, 5000)
    }
    
    // Refresh the page to show new tasks
    window.location.reload()
  }

  // Set submit button state
  setSubmitButtonState(disabled, text) {
    if (this.hasSubmitButtonTarget) {
      this.submitButtonTarget.disabled = disabled
      this.submitButtonTarget.textContent = text
    }
  }
} 