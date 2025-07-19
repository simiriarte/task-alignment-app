import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["dropZone"]
  
  connect() {
    console.log("Drag and drop controller connected")
    this.setupDragAndDrop()
    
    // Listen for custom refresh event
    this.element.addEventListener('refreshDragDrop', this.refreshDragAndDrop.bind(this))
  }
  
  disconnect() {
    // Clean up event listener
    this.element.removeEventListener('refreshDragDrop', this.refreshDragAndDrop.bind(this))
  }

  setupDragAndDrop() {
    // Make all task cards draggable - search the entire dashboard
    document.querySelectorAll('.task-card').forEach(card => {
      card.draggable = true
      
      // Remove existing listeners to avoid duplicates
      card.removeEventListener('dragstart', this.handleDragStart.bind(this))
      card.removeEventListener('dragend', this.handleDragEnd.bind(this))
      
      // Add fresh listeners
      card.addEventListener('dragstart', this.handleDragStart.bind(this))
      card.addEventListener('dragend', this.handleDragEnd.bind(this))
    })

    // Setup drop zones
    this.dropZoneTargets.forEach(zone => {
      zone.addEventListener('dragover', this.handleDragOver.bind(this))
      zone.addEventListener('dragenter', this.handleDragEnter.bind(this))
      zone.addEventListener('dragleave', this.handleDragLeave.bind(this))
      zone.addEventListener('drop', this.handleDrop.bind(this))
    })
  }

  handleDragStart(event) {
    const taskCard = event.target.closest('.task-card')
    if (!taskCard) return

    // Store task data for drop handling
    this.draggedTask = {
      element: taskCard,
      taskId: taskCard.dataset.taskId,
      currentStatus: taskCard.dataset.status,
      hasRatings: this.hasAllRatings(taskCard)
    }
    
    console.log('=== DRAG START DEBUG ===')
    console.log('Task ID:', this.draggedTask.taskId)
    console.log('Current Status:', this.draggedTask.currentStatus)
    console.log('Has Ratings:', this.draggedTask.hasRatings)
    console.log('========================')

    // Add visual feedback
    taskCard.classList.add('dragging')
    
    // Set drag effect
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/html', taskCard.outerHTML)
    
    // Show valid drop zones
    this.highlightValidDropZones()
    
    console.log('Drag started:', this.draggedTask)
  }

  handleDragEnd(event) {
    const taskCard = event.target.closest('.task-card')
    if (taskCard) {
      taskCard.classList.remove('dragging')
      taskCard.classList.add('drag-released')
      
      // Remove hover-disable class after transition completes
      setTimeout(() => {
        taskCard.classList.remove('drag-released')
      }, 350)
    }
    
    // Remove all drop zone highlights
    this.removeAllDropZoneHighlights()
    this.draggedTask = null
  }

  handleDragOver(event) {
    event.preventDefault() // Allow drop
    event.dataTransfer.dropEffect = 'move'
  }

  handleDragEnter(event) {
    event.preventDefault()
    const dropZone = event.target.closest('[data-drag-drop-target="dropZone"]')
    if (dropZone && this.isValidDropZone(dropZone)) {
      dropZone.classList.add('drag-over')
    }
  }

  handleDragLeave(event) {
    const dropZone = event.target.closest('[data-drag-drop-target="dropZone"]')
    if (dropZone) {
      // Only remove highlight if we're actually leaving the drop zone
      const rect = dropZone.getBoundingClientRect()
      const x = event.clientX
      const y = event.clientY
      
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        dropZone.classList.remove('drag-over')
      }
    }
  }

  async handleDrop(event) {
    event.preventDefault()
    
    const dropZone = event.target.closest('[data-drag-drop-target="dropZone"]')
    if (!dropZone || !this.draggedTask) return

    const targetStatus = dropZone.dataset.status

    // Remove drop zone highlights
    this.removeAllDropZoneHighlights()

    // Don't process if dropping in same section
    if (this.draggedTask.currentStatus === targetStatus) {
      console.log('Dropped in same section, ignoring')
      return
    }

    // Validate the drop
    const newStatus = this.getNewStatusForDrop(targetStatus)
    if (!newStatus) {
      console.log('Invalid drop, showing error feedback')
      this.showInvalidDropFeedback()
      return
    }

    // Perform the status update
    await this.updateTaskStatus(this.draggedTask.taskId, newStatus)
  }

  getNewStatusForDrop(targetStatus) {
    const { currentStatus, hasRatings } = this.draggedTask
    
    console.log('=== DROP VALIDATION DEBUG ===')
    console.log('Current Status:', currentStatus)
    console.log('Target Status:', targetStatus)
    console.log('Has Ratings:', hasRatings)

    switch (currentStatus) {
      case 'unrated':
        // Filter tasks (unrated) can go to parked, or to priorities if they have ratings
        if (targetStatus === 'parked') {
          console.log('✅ ALLOWING: unrated → parked')
          return 'parked'
        }
        if (targetStatus === 'rated' && hasRatings) {
          console.log('✅ ALLOWING: unrated (with ratings) → priorities')
          return 'rated'
        }
        if (targetStatus === 'rated' && !hasRatings) {
          console.log('❌ BLOCKING: unrated (no ratings) → priorities')
          this.highlightMissingRatings()
          return null
        }
        console.log('❌ BLOCKING: unrated → ' + targetStatus)
        return null
        
      case 'rated':
        // Rated tasks (including prioritized) can go to prioritized, parked, or completed
        if (targetStatus === 'rated') {
          // Check if task actually has ratings before allowing move to prioritized
          if (hasRatings) {
            return 'rated' // Move to prioritized
          } else {
            // Show red borders for missing ratings
            this.highlightMissingRatings()
            return null
          }
        }
        if (targetStatus === 'parked') {
          return 'parked'
        }
        if (targetStatus === 'completed') {
          return 'completed'
        }
        return null
        
      case 'parked':
        // Parked tasks behavior depends on if they have ratings
        if (hasRatings) {
          // Parked (rated) can go to prioritized or completed
          if (targetStatus === 'rated') {
            return 'rated' // Move to prioritized
          }
          if (targetStatus === 'completed') {
            return 'completed'
          }
        } else {
          // Parked (unrated) can only go to completed
          if (targetStatus === 'completed') {
            return 'completed'
          }
          // If trying to move to prioritized without ratings, show feedback
          if (targetStatus === 'rated') {
            this.highlightMissingRatings()
            return null
          }
        }
        return null
        
      case 'completed':
        // Completed tasks can go back to prioritized or parked (undo mistakes)
        if (targetStatus === 'rated') {
          return 'rated' // Move to prioritized
        }
        if (targetStatus === 'parked') {
          return 'parked'
        }
        return null
        
      default:
        return null
    }
  }

  async updateTaskStatus(taskId, newStatus) {
    // Store undo data BEFORE making any changes that might clear this.draggedTask
    const undoData = this.draggedTask ? {
      taskId: this.draggedTask.taskId,
      previousStatus: this.draggedTask.currentStatus,
      newStatus: newStatus
    } : null

    // Store draggedTask data before async operation since it might be cleared
    const taskElement = this.draggedTask ? this.draggedTask.element : null
    const currentStatus = this.draggedTask ? this.draggedTask.currentStatus : null

    try {
      const response = await fetch(`/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          task: { status: newStatus }
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          console.log('Task status updated successfully')
          
          // Store undo action using the data we saved earlier
          if (undoData) {
            this.storeUndoActionWithData(undoData)
          }
          
          // Move task card to correct section without page reload
          this.moveTaskCardToSection(taskElement, newStatus, currentStatus)
          
          // Update section counters
          this.updateSectionCounters()
        }
      }
    } catch (error) {
      console.error('Error updating task status:', error)
    }
  }

  hasAllRatings(taskCard) {
    // Check if task has all required ratings
    const energySelect = taskCard.querySelector('select[name="task[energy]"]')
    const simplicitySelect = taskCard.querySelector('select[name="task[simplicity]"]')
    const impactSelect = taskCard.querySelector('select[name="task[impact]"]')
    
    console.log('=== RATING CHECK DEBUG ===')
    console.log('Energy select found:', !!energySelect, energySelect?.value)
    console.log('Simplicity select found:', !!simplicitySelect, simplicitySelect?.value)
    console.log('Impact select found:', !!impactSelect, impactSelect?.value)
    
    if (!energySelect || !simplicitySelect || !impactSelect) {
      // If selects don't exist, task is already rated (showing date display)
      console.log('No selects found - assuming already rated: TRUE')
      return true
    }
    
    const hasRatings = !!(energySelect.value && simplicitySelect.value && impactSelect.value)
    console.log('All rating values present:', hasRatings)
    console.log('==========================')
    
    return hasRatings
  }

  highlightMissingRatings() {
    const taskCard = this.draggedTask.element
    const energySelect = taskCard.querySelector('select[name="task[energy]"]')
    const simplicitySelect = taskCard.querySelector('select[name="task[simplicity]"]')
    const impactSelect = taskCard.querySelector('select[name="task[impact]"]')
    
    // Add red border to fields that are missing values
    if (energySelect && !energySelect.value) {
      energySelect.style.borderColor = '#ef4444'
    }
    if (simplicitySelect && !simplicitySelect.value) {
      simplicitySelect.style.borderColor = '#ef4444'
    }
    if (impactSelect && !impactSelect.value) {
      impactSelect.style.borderColor = '#ef4444'
    }
    
    // Remove red border after 3 seconds
    setTimeout(() => {
      if (energySelect) energySelect.style.borderColor = ''
      if (simplicitySelect) simplicitySelect.style.borderColor = ''
      if (impactSelect) impactSelect.style.borderColor = ''
    }, 3000)
  }

  highlightValidDropZones() {
    this.dropZoneTargets.forEach(zone => {
      if (this.isValidDropZone(zone)) {
        zone.classList.add('valid-drop-zone')
      }
    })
  }

  isValidDropZone(dropZone) {
    if (!this.draggedTask) return false
    
    const targetStatus = dropZone.dataset.status
    const { currentStatus, hasRatings } = this.draggedTask

    // Don't highlight current section
    if (currentStatus === targetStatus) return false

    // Check if drop would be valid using same logic as getNewStatusForDrop
    switch (currentStatus) {
      case 'unrated':
        // Filter tasks (unrated) can go to parked, or to priorities if they have ratings
        return targetStatus === 'parked' || (targetStatus === 'rated' && hasRatings)
        
      case 'rated':
        // Rated tasks (including prioritized) can go to prioritized, parked, or completed
        return targetStatus === 'rated' || targetStatus === 'parked' || targetStatus === 'completed'
        
      case 'parked':
        // Parked tasks behavior depends on if they have ratings
        if (hasRatings) {
          // Parked (rated) can go to prioritized or completed
          return targetStatus === 'rated' || targetStatus === 'completed'
        } else {
          // Parked (unrated) can only go to completed
          return targetStatus === 'completed'
        }
        
      case 'completed':
        // Completed tasks can go back to prioritized or parked (undo mistakes)
        return targetStatus === 'rated' || targetStatus === 'parked'
        
      default:
        return false
    }
  }

  removeAllDropZoneHighlights() {
    this.dropZoneTargets.forEach(zone => {
      zone.classList.remove('drag-over', 'valid-drop-zone')
    })
  }

  showInvalidDropFeedback() {
    // Add shake animation to the dragged task
    if (this.draggedTask && this.draggedTask.element) {
      this.draggedTask.element.style.animation = 'shake 0.5s ease-in-out'
      setTimeout(() => {
        if (this.draggedTask && this.draggedTask.element) {
          this.draggedTask.element.style.animation = ''
        }
      }, 500)
    }
  }

  storeUndoActionWithData(undoData) {
    if (!window.UndoManager) {
      window.UndoManager = { actions: [], maxActions: 10 }
    }
    
    window.UndoManager.actions.push({
      action: 'drag_drop',
      data: undoData,
      timestamp: Date.now()
    })
    
    if (window.UndoManager.actions.length > window.UndoManager.maxActions) {
      window.UndoManager.actions.shift()
    }
  }

  // Legacy method - kept for compatibility but with null safety
  storeUndoAction(newStatus) {
    if (!this.draggedTask) {
      console.warn('Cannot store undo action: draggedTask is null')
      return
    }
    
    this.storeUndoActionWithData({
      taskId: this.draggedTask.taskId,
      previousStatus: this.draggedTask.currentStatus,
      newStatus: newStatus
    })
  }

  // Called when new tasks are added dynamically
  refreshDragAndDrop() {
    console.log('Refreshing drag and drop for new tasks')
    this.setupDragAndDrop()
  }
  
  // Method to set up drag and drop for a specific new task card
  setupNewTaskCard(taskCard) {
    if (taskCard) {
      taskCard.draggable = true
      taskCard.addEventListener('dragstart', this.handleDragStart.bind(this))
      taskCard.addEventListener('dragend', this.handleDragEnd.bind(this))
    }
  }

  moveTaskCardToSection(taskCard, newStatus, currentStatus) {
    if (!taskCard) {
      console.error('Task card is null, cannot move')
      return
    }

    // Find the target section
    const targetSection = document.querySelector(`[data-status="${newStatus}"] .task-cards-container`)
    if (!targetSection) {
      console.error('Target section not found for status:', newStatus)
      return
    }

    // Update task card's data-status attribute
    taskCard.dataset.status = newStatus

    // Hide empty state in target section if it exists
    const targetEmptyState = targetSection.parentElement.querySelector('.section-empty-state')
    if (targetEmptyState) {
      targetEmptyState.style.display = 'none'
    }

    // Move the task card to the target section
    targetSection.appendChild(taskCard)

    // Check if source section is now empty and show empty state
    const sourceSection = document.querySelector(`[data-status="${currentStatus}"] .task-cards-container`)
    if (sourceSection && sourceSection.children.length === 0) {
      const sourceEmptyState = sourceSection.parentElement.querySelector('.section-empty-state')
      if (sourceEmptyState) {
        sourceEmptyState.style.display = 'block'
      }
    }

    console.log(`Task moved from ${currentStatus} to ${newStatus}`)
  }

  updateSectionCounters() {
    // Update counters for each section
    const sections = ['unrated', 'rated', 'parked', 'completed']
    
    sections.forEach(status => {
      const container = document.querySelector(`[data-status="${status}"] .task-cards-container`)
      const counter = document.querySelector(`[data-status="${status}"] .section-count`)
      
      if (container && counter) {
        const count = container.children.length
        const label = this.getCounterLabel(status, count)
        counter.textContent = `${count} ${label}`
      }
    })
  }

  getCounterLabel(status, count) {
    switch (status) {
      case 'unrated': return 'unfiltered'
      case 'rated': return 'prioritized'
      case 'parked': return 'parked'
      case 'completed': return 'completed'
      default: return ''
    }
  }
}