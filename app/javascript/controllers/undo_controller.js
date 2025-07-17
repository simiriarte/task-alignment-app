import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    // Add global keyboard listener for undo
    document.addEventListener('keydown', this.handleKeydown.bind(this))
  }

  disconnect() {
    // Remove global keyboard listener
    document.removeEventListener('keydown', this.handleKeydown.bind(this))
  }

  handleKeydown(event) {
    // Check for Ctrl+Z (Windows/Linux) or Cmd+Z (Mac)
    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
      event.preventDefault()
      this.performUndo()
    }
  }

  async performUndo() {
    if (!window.UndoManager || window.UndoManager.actions.length === 0) {
      console.log('No actions to undo')
      return
    }

    const lastAction = window.UndoManager.actions.pop()
    
    try {
      switch (lastAction.action) {
        case 'complete':
          await this.undoComplete(lastAction.data)
          break
        case 'park':
          await this.undoPark(lastAction.data)
          break
        case 'unpark':
          await this.undoUnpark(lastAction.data)
          break
        case 'rate':
          await this.undoRate(lastAction.data)
          break
        case 'delete':
          await this.undoDelete(lastAction.data)
          break
        default:
          console.log('Unknown action type:', lastAction.action)
      }
    } catch (error) {
      console.error('Error performing undo:', error)
      // Put the action back if it failed
      window.UndoManager.actions.push(lastAction)
    }
  }

  async undoComplete(data) {
    await this.updateTaskStatus(data.taskId, data.previousStatus)
  }

  async undoPark(data) {
    await this.updateTaskStatus(data.taskId, data.previousStatus)
  }

  async undoUnpark(data) {
    await this.updateTaskStatus(data.taskId, data.previousStatus)
  }

  async undoRate(data) {
    await this.updateTaskStatus(data.taskId, data.previousStatus)
  }

  async undoDelete(data) {
    // For delete undo, we need to recreate the task
    // This would require storing more data about the task
    console.log('Delete undo not implemented yet')
  }

  async updateTaskStatus(taskId, status) {
    const response = await fetch(`/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        task: {
          status: status
        }
      })
    })

    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        // Reload page to show task in correct section
        window.location.reload()
      }
    }
  }
}