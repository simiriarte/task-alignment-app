import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "modal", 
    "backdrop",
    "form", 
    "textarea", 
    "errors", 
    "submitButton",
    "parentTaskId"
  ]

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

  // Open modal from task card
  openModal(event) {
    event.preventDefault()
    
    // Get the parent task ID from the button that triggered this
    const button = event.target.closest('button')
    const parentTaskId = button.dataset.taskId
    
    if (!parentTaskId) {
      console.error("Parent task ID not found!")
      return
    }
    
    if (!this.hasModalTarget || !this.hasBackdropTarget) {
      console.error("Subtask modal or backdrop target not found!")
      return
    }
    
    // Set the parent task ID in the hidden field
    this.parentTaskIdTarget.value = parentTaskId
    
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
    this.parentTaskIdTarget.value = ''
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
      this.showError('Please enter some text to create subtasks from.')
      this.textareaTarget.focus()
      return
    }

    const parentTaskId = this.parentTaskIdTarget.value
    if (!parentTaskId) {
      this.showError('Parent task ID is missing.')
      return
    }

    this.clearErrors()
    this.setSubmitButtonState(true, 'Creating...')

    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content')

      const response = await fetch(`/tasks/${parentTaskId}/subtasks`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          subtask_text: textareaValue
        })
      })

      const data = await response.json()

      if (data.success) {
        this.handleSuccess(data)
      } else {
        this.showError(data.error || 'An error occurred while creating subtasks.')
      }
    } catch (error) {
      console.error('Error:', error)
      this.showError('An error occurred while creating subtasks. Please try again.')
    } finally {
      this.setSubmitButtonState(false, 'Create Subtasks')
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
      this.errorsTarget.innerHTML = `
        <div class="error-message">
          ${message}
        </div>
      `
      this.errorsTarget.style.display = 'block'
    }
  }

  // Handle successful creation
  handleSuccess(data) {
    console.log('Subtasks created successfully:', data.subtasks)
    
    // Close modal
    this.closeModal()
    
    // Refresh the parent task card to show subtasks
    const parentTaskId = this.parentTaskIdTarget.value
    const parentTaskCard = document.querySelector(`[data-task-id="${parentTaskId}"]`)
    
    if (parentTaskCard) {
      // Trigger a custom event that the task card can listen for
      parentTaskCard.dispatchEvent(new CustomEvent('subtasks:created', {
        detail: { subtasks: data.subtasks }
      }))
    }
    
    // Show success message
    this.showFlashMessage(`Created ${data.subtasks.length} subtask${data.subtasks.length !== 1 ? 's' : ''}`, 'success')
  }

  // Set submit button state
  setSubmitButtonState(loading, text) {
    if (this.hasSubmitButtonTarget) {
      this.submitButtonTarget.disabled = loading
      this.submitButtonTarget.textContent = text
    }
  }

  // Show flash message (reuse existing pattern)
  showFlashMessage(message, type) {
    // Create flash message element
    const flash = document.createElement('div')
    flash.className = `flash-message flash-${type}`
    flash.textContent = message
    flash.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#10b981' : '#ef4444'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 9999;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `
    
    document.body.appendChild(flash)
    
    // Animate in
    setTimeout(() => {
      flash.style.transform = 'translateX(0)'
    }, 10)
    
    // Remove after delay
    setTimeout(() => {
      flash.style.transform = 'translateX(100%)'
      setTimeout(() => {
        if (flash.parentNode) {
          flash.parentNode.removeChild(flash)
        }
      }, 300)
    }, 3000)
  }
}