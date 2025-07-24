import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    // Initialize undo stack
    this.undoStack = []
    this.maxStackSize = 50 // Limit stack size to prevent memory issues
    
    // Make this controller globally accessible
    window.UndoManager = this
    
    // Listen for global keyboard shortcuts
    this.handleKeypress = this.handleKeypress.bind(this)
    document.addEventListener('keydown', this.handleKeypress)
    
    console.log("Undo Manager initialized")
  }
  
  disconnect() {
    document.removeEventListener('keydown', this.handleKeypress)
    window.UndoManager = null
  }
  
  handleKeypress(event) {
    // Check for Ctrl+Z (Windows/Linux) or Cmd+Z (Mac)
    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
      event.preventDefault()
      this.undo()
    }
  }
  
  // Add an action to the undo stack
  addAction(action) {
    this.undoStack.push({
      ...action,
      timestamp: Date.now()
    })
    
    // Limit stack size
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift()
    }
    
    console.log(`Added ${action.type} action to undo stack. Stack size: ${this.undoStack.length}`)
  }
  
  // Perform undo operation
  async undo() {
    if (this.undoStack.length === 0) {
      console.log("Nothing to undo")
      return
    }
    
    const action = this.undoStack.pop()
    console.log(`Undoing ${action.type} action`)
    
    try {
      switch (action.type) {
        case 'task_create':
          await this.undoTaskCreate(action)
          break
        case 'task_delete':
          await this.undoTaskDelete(action)
          break
        case 'task_edit':
          await this.undoTaskEdit(action)
          break
        case 'task_status_change':
          await this.undoTaskStatusChange(action)
          break
        case 'subtask_create':
          await this.undoSubtaskCreate(action)
          break
        case 'subtask_delete':
          await this.undoSubtaskDelete(action)
          break
        case 'subtask_toggle':
          await this.undoSubtaskToggle(action)
          break
        default:
          console.error(`Unknown action type: ${action.type}`)
      }
    } catch (error) {
      console.error(`Failed to undo ${action.type}:`, error)
      // Re-add the action to the stack if undo failed
      this.undoStack.push(action)
    }
  }
  
  // Undo task creation by deleting it
  async undoTaskCreate(action) {
    const { taskId } = action.data
    
    const response = await fetch(`/tasks/${taskId}`, {
      method: 'DELETE',
      headers: {
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
    
    if (response.ok) {
      // Find and remove the task element from DOM
      const taskElement = document.querySelector(`[data-task-id="${taskId}"]`)
      if (taskElement) {
        const wrapper = taskElement.closest('.task-card-wrapper')
        const elementToRemove = wrapper || taskElement
        elementToRemove.remove()
      }
      
      // Update counters
      this.updateCounters()
    }
  }
  
  // Undo task deletion by recreating it
  async undoTaskDelete(action) {
    const { taskData } = action.data
    
    const response = await fetch('/tasks/undo_delete', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ task_data: taskData })
    })
    
    if (response.ok) {
      // Reload to show restored task in correct section
      window.location.reload()
    }
  }
  
  // Undo task edit by restoring previous values
  async undoTaskEdit(action) {
    const { taskId, previousData, field } = action.data
    
    const formData = new FormData()
    formData.append(`task[${field}]`, previousData[field])
    
    const response = await fetch(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: formData,
      headers: {
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
    
    if (response.ok) {
      // Update the field in the DOM
      const taskElement = document.querySelector(`[data-task-id="${taskId}"]`)
      if (taskElement) {
        const controller = this.application.getControllerForElementAndIdentifier(taskElement, 'task-card')
        if (controller) {
          // Update the specific field
          if (field === 'title') {
            const titleInput = taskElement.querySelector('.task-title-input')
            if (titleInput) titleInput.value = previousData[field]
          } else if (field === 'due_date') {
            const dateInput = taskElement.querySelector('[name="task[due_date]"]')
            if (dateInput) dateInput.value = previousData[field] || ''
          }
          // Add more field updates as needed
        }
      }
    }
  }
  
  // Undo task status change
  async undoTaskStatusChange(action) {
    const { taskId, previousStatus } = action.data
    
    const formData = new FormData()
    formData.append('task[status]', previousStatus)
    
    const response = await fetch(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: formData,
      headers: {
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
    
    if (response.ok) {
      // Reload to show task in correct section
      window.location.reload()
    }
  }
  
  // Undo subtask creation by deleting it
  async undoSubtaskCreate(action) {
    const { subtaskId } = action.data
    
    const response = await fetch(`/tasks/${subtaskId}`, {
      method: 'DELETE',
      headers: {
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
    
    if (response.ok) {
      // Remove subtask from DOM
      const subtaskElement = document.querySelector(`[data-subtask-id="${subtaskId}"]`)
      if (subtaskElement) {
        const subtaskItem = subtaskElement.closest('.subtask-item')
        if (subtaskItem) subtaskItem.remove()
      }
    }
  }
  
  // Undo subtask deletion by recreating it
  async undoSubtaskDelete(action) {
    const { parentTaskId, subtaskData } = action.data
    
    const response = await fetch(`/tasks/${parentTaskId}/create_subtask`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        title: subtaskData.title
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        // Find parent task and add subtask
        const parentTask = document.querySelector(`[data-task-id="${parentTaskId}"]`)
        if (parentTask) {
          const controller = this.application.getControllerForElementAndIdentifier(parentTask, 'task-card')
          if (controller) {
            controller.addSubtaskToList(data.subtask)
            
            // Restore completion status if needed
            if (subtaskData.completed) {
              const subtaskCheckbox = parentTask.querySelector(`[data-subtask-id="${data.subtask.id}"]`)
              if (subtaskCheckbox) subtaskCheckbox.click()
            }
          }
        }
      }
    }
  }
  
  // Undo subtask toggle
  async undoSubtaskToggle(action) {
    const { parentTaskId, subtaskId } = action.data
    
    const response = await fetch(`/tasks/${parentTaskId}/toggle_subtask/${subtaskId}`, {
      method: 'PATCH',
      headers: {
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
    
    if (response.ok) {
      // Toggle checkbox in DOM
      const checkbox = document.querySelector(`[data-subtask-id="${subtaskId}"]`)
      if (checkbox) {
        checkbox.classList.toggle('checked')
      }
    }
  }
  
  // Update dashboard counters
  updateCounters() {
    if (window.DashboardCounters) {
      // Fetch updated counts
      fetch('/tasks', {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.counts) {
          window.DashboardCounters.updateCounters(data.counts)
        }
      })
    }
  }
}