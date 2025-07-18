import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["taskContainer", "emptyState", "counter"]
  static values = { url: String }

  connect() {
    console.log("Filter tasks controller connected")
  }

  async addNewTask(event) {
    event.preventDefault()
    
    try {
      // Create a new blank task
      const response = await this.createBlankTask()
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.success) {
          // Add the new task card to the container
          this.insertNewTaskCard(data.task_html)
          
          // Update counter
          this.updateCounter(data.unrated_count)
          
          // Update global counters if available
          if (data.unrated_count !== undefined && window.DashboardCounters) {
            window.DashboardCounters.updateSingleCounter('unrated', data.unrated_count)
          }
          
          // Hide empty state if visible
          this.hideEmptyState()
          
          // Focus on the new task's title field
          this.focusNewTask()
        } else {
          this.showError(data.error || "Failed to create task")
        }
      } else {
        this.showError("Failed to create task")
      }
    } catch (error) {
      console.error("Error creating task:", error)
      this.showError("An error occurred while creating the task")
    }
  }

  async createBlankTask() {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content')
    
    return fetch(this.urlValue, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        task: {
          title: "New Task",
          status: "unrated",
          cognitive_density: 0,
          estimated_hours: 0
        },
        inline: true
      })
    })
  }

  insertNewTaskCard(taskHtml) {
    // If no task container exists, create one
    if (!this.hasTaskContainerTarget) {
      this.createTaskContainer()
    }
    
    // Insert the new task card at the beginning
    this.taskContainerTarget.insertAdjacentHTML('afterbegin', taskHtml)
    
    // Set up drag and drop for the new task card
    this.setupDragAndDropForNewTask()
  }
  
  setupDragAndDropForNewTask() {
    // Simple approach: just refresh all drag and drop after a short delay
    setTimeout(() => {
      const dashboardGrid = document.querySelector('[data-controller*="drag-drop"]')
      if (dashboardGrid) {
        // Dispatch a custom event that the drag-drop controller can listen to
        dashboardGrid.dispatchEvent(new CustomEvent('refreshDragDrop'))
      }
    }, 100)
  }

  createTaskContainer() {
    const sectionContent = this.element.querySelector('.section-content')
    const taskContainer = document.createElement('div')
    taskContainer.className = 'task-cards-container'
    taskContainer.setAttribute('data-filter-tasks-target', 'taskContainer')
    
    sectionContent.appendChild(taskContainer)
  }

  hideEmptyState() {
    if (this.hasEmptyStateTarget) {
      this.emptyStateTarget.style.display = 'none'
    }
  }

  showEmptyState() {
    if (this.hasEmptyStateTarget) {
      this.emptyStateTarget.style.display = 'flex'
    }
  }

  updateCounter(count) {
    if (this.hasCounterTarget) {
      this.counterTarget.textContent = `${count} unfiltered`
    }
  }

  focusNewTask() {
    // Find the first task card's title input and focus it
    const firstTaskCard = this.taskContainerTarget.querySelector('.task-card')
    if (firstTaskCard) {
      const titleInput = firstTaskCard.querySelector('.task-title')
      if (titleInput) {
        setTimeout(() => {
          titleInput.focus()
          titleInput.select()
        }, 100)
      }
    }
  }

  showError(message) {
    // Create a temporary flash message
    const flashMessage = document.createElement('div')
    flashMessage.className = 'alert'
    flashMessage.textContent = message
    
    // Insert at top of main content
    const mainContent = document.querySelector('.main-content')
    if (mainContent) {
      mainContent.insertBefore(flashMessage, mainContent.firstChild)
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        flashMessage.remove()
      }, 5000)
    }
  }

  // Called when a task is deleted from a task card
  taskDeleted() {
    // Check if we need to show empty state
    const remainingTasks = this.taskContainerTarget?.children.length || 0
    
    if (remainingTasks === 0) {
      this.showEmptyState()
    }
    
    // Update local counter based on remaining tasks
    this.updateCounter(remainingTasks)
    
    // Note: Global counters are updated by the task card controller 
    // when it receives the server response with updated counts
  }
} 