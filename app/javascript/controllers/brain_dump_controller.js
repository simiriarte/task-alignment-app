import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "modal", 
    "backdrop",
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
    // Update keyboard hint for the user's OS
    this.updateKeyboardHint()
  }
  
  updateKeyboardHint() {
    const hint = this.element.querySelector('.keyboard-hint')
    if (hint) {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      hint.innerHTML = isMac 
        ? '<kbd>⌘</kbd><kbd>Enter</kbd> to submit' 
        : '<kbd>Ctrl</kbd><kbd>Enter</kbd> to submit'
    }
  }

  // Open modal
  openModal(event) {
    event.preventDefault()
    
    if (!this.hasModalTarget || !this.hasBackdropTarget) {
      console.error("Brain dump modal or backdrop target not found!")
      return
    }
    
    this.backdropTarget.classList.add('show')
    this.modalTarget.classList.add('show')
    this.clearErrors()
    
    // Focus on textarea after animation
    setTimeout(() => {
      if (this.hasTextareaTarget) {
        this.textareaTarget.focus()
      }
    }, 150)
  }

  // Close modal
  closeModal() {
    this.modalTarget.classList.remove('show')
    this.backdropTarget.classList.remove('show')
    this.textareaTarget.value = ''
    this.clearErrors()
  }

  // Handle clicking outside modal
  handleBackdropClick(event) {
    if (event.target === this.backdropTarget) {
      this.closeModal()
    }
  }

  // Handle keyboard shortcuts
  handleKeydown(event) {
    if (!this.modalTarget.classList.contains('show')) return
    
    // Escape to close
    if (event.key === 'Escape') {
      this.closeModal()
    }
    
    // Cmd+Enter or Ctrl+Enter to submit
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      this.submitForm(event)
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
    
    // Update counters immediately if available
    if (data.counts && window.DashboardCounters) {
      window.DashboardCounters.updateCounters(data.counts)
    }
    
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
    
    // Instead of reloading, let's update the UI dynamically
    this.updateTasksAfterBrainDump(data)
  }
  
  // Update the tasks section after brain dump creation
  updateTasksAfterBrainDump(data) {
    // Find the filter tasks controller
    const filterTasksElement = document.querySelector('[data-controller*="filter-tasks"]')
    if (filterTasksElement) {
      const filterTasksController = this.application.getControllerForElementAndIdentifier(
        filterTasksElement, 
        'filter-tasks'
      )
      
      // If we have created tasks data, add them to the filter section
      if (data.tasks && data.tasks.length > 0 && filterTasksController) {
        // For now, just reload to show the new tasks
        // In the future, we could render the task cards directly
        window.location.reload()
      }
    } else {
      // Fallback to page reload
      window.location.reload()
    }
  }

  // Set submit button state
  setSubmitButtonState(disabled, text) {
    if (this.hasSubmitButtonTarget) {
      this.submitButtonTarget.disabled = disabled
      this.submitButtonTarget.textContent = text
    }
  }
} 