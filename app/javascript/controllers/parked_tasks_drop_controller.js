import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    console.log('Parked tasks drop zone connected')
    
    // Bind event handlers
    this.dragOverHandler = this.dragOver.bind(this)
    this.dragEnterHandler = this.dragEnter.bind(this)
    this.dragLeaveHandler = this.dragLeave.bind(this)
    this.dropHandler = this.drop.bind(this)
    
    // Add event listeners
    this.element.addEventListener('dragover', this.dragOverHandler)
    this.element.addEventListener('dragenter', this.dragEnterHandler)
    this.element.addEventListener('dragleave', this.dragLeaveHandler)
    this.element.addEventListener('drop', this.dropHandler)
  }

  disconnect() {
    this.element.removeEventListener('dragover', this.dragOverHandler)
    this.element.removeEventListener('dragenter', this.dragEnterHandler)
    this.element.removeEventListener('dragleave', this.dragLeaveHandler)
    this.element.removeEventListener('drop', this.dropHandler)
  }

  dragOver(event) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  dragEnter(event) {
    event.preventDefault()
    console.log('Drag enter on parked tasks section')
    
    // Always highlight when something is dragged over
    // We'll validate the data type on drop
    this.element.classList.add('drag-over')
  }

  dragLeave(event) {
    // Only remove highlight if leaving the section entirely
    if (!this.element.contains(event.relatedTarget)) {
      this.element.classList.remove('drag-over')
    }
  }

  async drop(event) {
    event.preventDefault()
    console.log('Drop event on Parked Tasks section')
    
    this.element.classList.remove('drag-over', 'valid-drop-zone')
    
    try {
      const dragData = JSON.parse(event.dataTransfer.getData('application/json'))
      console.log('Dropped data:', dragData)
      
      if (dragData.type === 'subtask') {
        await this.convertSubtaskToParkedTask(dragData)
      }
    } catch (error) {
      console.error('Error processing drop:', error)
      this.showError('Failed to convert subtask to parked task')
    }
  }

  async convertSubtaskToParkedTask(dragData) {
    try {
      const response = await fetch(`/tasks/${dragData.subtaskId}/convert_to_main_task`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          parent_task_id: dragData.parentTaskId,
          target_status: 'parked'
        })
      })

      const data = await response.json()
      
      if (response.ok && data.success) {
        console.log('Subtask converted to parked task successfully:', data)
        
        // Add to undo stack
        if (window.UndoManager) {
          window.UndoManager.addAction({
            type: 'subtask_convert',
            data: {
              newTaskId: data.task.id,
              originalSubtaskId: dragData.subtaskId,
              originalParentTaskId: dragData.parentTaskId
            }
          })
        }
        
        // Remove the dragged subtask from DOM
        const draggedElement = document.querySelector(`[data-subtask-id="${dragData.subtaskId}"]`)
        if (draggedElement) {
          draggedElement.remove()
        }
        
        // Add the new task to the Parked Tasks section
        if (data.task_html) {
          const taskContainer = this.element.querySelector('.task-cards-container') || 
                              this.element.querySelector('.section-content')
          if (taskContainer) {
            taskContainer.insertAdjacentHTML('afterbegin', data.task_html)
          }
        }
        
        // Update counters if provided
        if (data.counts && window.DashboardCounters) {
          window.DashboardCounters.updateCounters(data.counts)
        }
        
        // Check if parent task has remaining subtasks
        this.checkParentTaskSubtasks(dragData.parentTaskId)
        
        // Success - no notification message needed
        
      } else {
        throw new Error(data.error || 'Failed to convert subtask')
      }
    } catch (error) {
      console.error('Error converting subtask:', error)
      this.showError('Failed to convert subtask to parked task')
    }
  }

  checkParentTaskSubtasks(parentTaskId) {
    // Find the parent task's subtask area
    const parentTask = document.querySelector(`[data-task-id="${parentTaskId}"]`)
    if (parentTask) {
      const subtaskArea = parentTask.closest('.task-card-wrapper')?.querySelector('.subtask-area')
      if (subtaskArea) {
        const remainingSubtasks = subtaskArea.querySelectorAll('.subtask-item')
        if (remainingSubtasks.length === 0) {
          // No more subtasks, hide the subtask area
          subtaskArea.remove()
        }
      }
    }
  }

  showSuccess(message) {
    this.showFlashMessage(message, 'notice')
  }

  showError(message) {
    this.showFlashMessage(message, 'alert')
  }

  showFlashMessage(message, type) {
    const flashMessage = document.createElement('div')
    flashMessage.className = type
    flashMessage.textContent = message
    
    const mainContent = document.querySelector('.main-content')
    if (mainContent) {
      mainContent.insertBefore(flashMessage, mainContent.firstChild)
      
      setTimeout(() => {
        flashMessage.remove()
      }, 3000)
    }
  }
}