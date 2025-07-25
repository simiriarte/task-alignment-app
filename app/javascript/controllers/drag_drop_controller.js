import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["dropZone"]
  
  connect() {
    console.log("🔗 Main task drag controller connected")
    this.setupDragAndDrop()
    
    // Listen for custom refresh event
    this.element.addEventListener('refreshDragDrop', this.refreshDragAndDrop.bind(this))
  }
  
  disconnect() {
    // Clean up event listener
    this.element.removeEventListener('refreshDragDrop', this.refreshDragAndDrop.bind(this))
  }

  setupDragAndDrop() {
    console.log("🔧 Setting up main task drag and drop")
    
    // Make all task cards draggable
    const taskCards = document.querySelectorAll('.task-card')
    console.log(`🔧 Found ${taskCards.length} task cards to make draggable`)
    
    taskCards.forEach((card, index) => {
      // The task cards already have draggable="true" in the HTML, so we don't need to set it
      // This prevents any conflicts with the HTML attribute
      
      // Store bound handlers
      if (!card._mainDragStartHandler) {
        card._mainDragStartHandler = this.handleDragStart.bind(this)
        card._mainDragEndHandler = this.handleDragEnd.bind(this)
      }
      
      // Remove existing listeners to avoid duplicates
      card.removeEventListener('dragstart', card._mainDragStartHandler)
      card.removeEventListener('dragend', card._mainDragEndHandler)
      
      // Add fresh listeners
      card.addEventListener('dragstart', card._mainDragStartHandler)
      card.addEventListener('dragend', card._mainDragEndHandler)
      
      // Make interactive elements non-draggable to prevent conflicts
      const interactiveElements = card.querySelectorAll('button, input, select, textarea, a, .subtask-drag-handle')
      interactiveElements.forEach(element => {
        element.draggable = false
        // Ensure elements can receive click events
        element.style.pointerEvents = 'auto'
      })
      
      // Special handling for subtask drag handles - they should remain draggable
      const subtaskHandles = card.querySelectorAll('.subtask-drag-handle')
      subtaskHandles.forEach(handle => {
        handle.draggable = true
      })
      
      console.log(`✅ Task card ${index + 1} setup complete`)
    })

    // Setup drop zones with enhanced logging
    console.log(`🔧 Setting up ${this.dropZoneTargets.length} drop zones`)
    this.dropZoneTargets.forEach((zone, index) => {
      const status = zone.dataset.status
      console.log(`🔧 Setting up drop zone ${index + 1}: ${status}`)
      
      // Store bound handlers
      if (!zone._dragOverHandler) {
        zone._dragOverHandler = this.handleDragOver.bind(this)
        zone._dragEnterHandler = this.handleDragEnter.bind(this)
        zone._dragLeaveHandler = this.handleDragLeave.bind(this)
        zone._dropHandler = this.handleDrop.bind(this)
      }
      
      // Remove existing listeners
      zone.removeEventListener('dragover', zone._dragOverHandler)
      zone.removeEventListener('dragenter', zone._dragEnterHandler)
      zone.removeEventListener('dragleave', zone._dragLeaveHandler)
      zone.removeEventListener('drop', zone._dropHandler)
      
      // Add fresh listeners
      zone.addEventListener('dragover', zone._dragOverHandler)
      zone.addEventListener('dragenter', zone._dragEnterHandler)
      zone.addEventListener('dragleave', zone._dragLeaveHandler)
      zone.addEventListener('drop', zone._dropHandler)
      
      console.log(`✅ Drop zone ${index + 1} (${status}) setup complete`)
    })
  }

  handleDragStart(event) {
    console.log('🚀 Main task drag start triggered')
    
    // CRITICAL: Check if drag originated from a subtask drag handle FIRST
    if (event.target.closest('.subtask-drag-handle') || event.target.classList.contains('subtask-drag-handle')) {
      console.log('❌ Drag from subtask handle, ignoring main task drag')
      // Don't process this as a main task drag
      return
    }
    
    const taskCard = event.target.closest('.task-card')
    if (!taskCard) {
      console.log('❌ No task card found')
      return
    }

    // CRITICAL: Check if drag originated from interactive elements
    const interactiveElements = ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'A']
    if (interactiveElements.includes(event.target.tagName) || 
        event.target.closest('input, button, select, textarea, a')) {
      console.log('❌ Drag from interactive element, ignoring')
      event.preventDefault() // Prevent the drag
      return
    }

    console.log('✅ Main task drag proceeding...')

    // Store task data for drop handling
    this.draggedTask = {
      element: taskCard,
      taskId: taskCard.dataset.taskId,
      currentStatus: taskCard.dataset.status,
      hasRatings: this.hasAllRatings(taskCard)
    }
    
    console.log('=== MAIN TASK DRAG DATA ===')
    console.log('Task ID:', this.draggedTask.taskId)
    console.log('Current Status:', this.draggedTask.currentStatus)
    console.log('Has Ratings:', this.draggedTask.hasRatings)
    console.log('===========================')

    // Prevent scrollbars during drag
    document.body.classList.add('dragging-active')

    // Add visual feedback
    taskCard.classList.add('dragging')
    
    // CRITICAL: Set drag data - use a unique identifier for main tasks
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('application/json', JSON.stringify({
      type: 'main-task',
      taskId: this.draggedTask.taskId,
      currentStatus: this.draggedTask.currentStatus,
      hasRatings: this.draggedTask.hasRatings
    }))
    
    // Show valid drop zones
    this.highlightValidDropZones()
    
    console.log('🚀 Main task drag started successfully')
  }

  handleDragEnd(event) {
    console.log('🏁 Main task drag ended')
    
    // Check if drag originated from subtask handle
    if (event.target.closest('.subtask-drag-handle')) {
      console.log('❌ Drag end from subtask handle, ignoring')
      return
    }

    const taskCard = event.target.closest('.task-card')
    if (taskCard) {
      taskCard.classList.remove('dragging')
      taskCard.classList.add('drag-released')
      
      // Remove hover-disable class after transition completes
      setTimeout(() => {
        taskCard.classList.remove('drag-released')
      }, 350)
    }
    
    // Re-enable scrollbars after drag
    document.body.classList.remove('dragging-active')
    
    // Remove all drop zone highlights
    this.removeAllDropZoneHighlights()
    this.draggedTask = null
    
    console.log('✅ Main task drag end cleanup complete')
  }

  handleDragOver(event) {
    event.preventDefault() // CRITICAL: Allow drop
    event.dataTransfer.dropEffect = 'move'
    
    // More aggressive prevention to ensure drop works
    event.stopPropagation()
    
    // Debug logging (can be removed later)
    // console.log('📍 Drag over zone:', event.target.closest('[data-drag-drop-target="dropZone"]')?.dataset.status)
  }

  handleDragEnter(event) {
    event.preventDefault()
    const dropZone = event.target.closest('[data-drag-drop-target="dropZone"]')
    if (dropZone) {
      console.log('🎯 Drag entered zone:', dropZone.dataset.status)
      if (this.isValidDropZone(dropZone)) {
        dropZone.classList.add('drag-over')
        console.log('✅ Zone highlighted as valid drop target')
      } else {
        console.log('❌ Zone is not valid for this task')
      }
    }
  }

  handleDragLeave(event) {
    const dropZone = event.target.closest('[data-drag-drop-target="dropZone"]')
    if (dropZone && !dropZone.contains(event.relatedTarget)) {
      dropZone.classList.remove('drag-over')
      console.log('👋 Left drop zone:', dropZone.dataset.status)
    }
  }

  async handleDrop(event) {
    event.preventDefault()
    event.stopPropagation() // Prevent other drop handlers from interfering
    console.log('🎯 MAIN TASK DROP EVENT TRIGGERED!')
    
    const dropZone = event.target.closest('[data-drag-drop-target="dropZone"]')
    if (!dropZone) {
      console.log('❌ No drop zone found')
      return
    }

    const targetStatus = dropZone.dataset.status
    console.log('🎯 Dropping in zone:', targetStatus)

    // Remove drop zone highlights immediately
    this.removeAllDropZoneHighlights()

    // Get drag data - handle both main task and potential subtask data
    let dragData
    try {
      const jsonData = event.dataTransfer.getData('application/json')
      if (jsonData) {
        dragData = JSON.parse(jsonData)
        console.log('📦 Parsed drag data:', dragData)
      }
    } catch (error) {
      console.log('⚠️ Could not parse JSON drag data, checking HTML data')
    }

    // If this is a subtask drag, let the subtask drop controllers handle it
    if (dragData && dragData.type === 'subtask') {
      console.log('🔄 Subtask drop detected, letting subtask controllers handle it')
      return
    }

    // Check if we have a main task drag in progress
    if (!this.draggedTask) {
      console.log('❌ No main task drag in progress - might be subtask or other drag')
      return
    }

    // Verify this is actually our main task drag
    if (!dragData || dragData.type !== 'main-task') {
      console.log('❌ Not a main task drag, ignoring')
      return
    }

    console.log('🎯 Processing main task drop...')

    // Don't process if dropping in same section
    if (this.draggedTask.currentStatus === targetStatus) {
      console.log('↩️ Dropped in same section, ignoring')
      return
    }

    // Validate the drop
    const newStatus = this.getNewStatusForDrop(targetStatus)
    if (!newStatus) {
      console.log('❌ Invalid drop target')
      // Special message for rated tasks trying to go to unrated
      if (targetStatus === 'unrated' && this.draggedTask.hasRatings) {
        console.log('⚠️ Rated tasks cannot be moved back to Filter Tasks')
      }
      this.showInvalidDropFeedback()
      return
    }

    console.log('✅ Valid drop! Updating task status to:', newStatus)

    // Perform the status update
    await this.updateTaskStatus(this.draggedTask.taskId, newStatus, targetStatus)
  }

  getNewStatusForDrop(targetStatus) {
    if (!this.draggedTask) return null
    
    const { currentStatus, hasRatings } = this.draggedTask
    
    console.log('=== DROP VALIDATION ===')
    console.log('From:', currentStatus, '→ To:', targetStatus)
    console.log('Has Ratings:', hasRatings)

    // CRITICAL: Prevent any task with ratings from going back to unrated
    if (targetStatus === 'unrated' && hasRatings) {
      console.log('❌ Cannot move rated task back to unrated/filtered section')
      return null
    }

    switch (currentStatus) {
      case 'unrated':
        if (targetStatus === 'parked') return 'parked'
        if (targetStatus === 'rated' && hasRatings) return 'rated'
        if (targetStatus === 'completed') return 'completed'
        break
        
      case 'rated':
        if (targetStatus === 'parked') return 'parked'
        if (targetStatus === 'completed') return 'completed'
        // Removed: if (targetStatus === 'unrated') return 'unrated'
        break
        
      case 'parked':
        if (targetStatus === 'rated' && hasRatings) return 'rated'
        if (targetStatus === 'completed') return 'completed'
        if (targetStatus === 'unrated' && !hasRatings) return 'unrated' // Only if no ratings
        break
        
      case 'completed':
        if (targetStatus === 'rated') return 'rated'
        if (targetStatus === 'parked') return 'parked'
        if (targetStatus === 'unrated' && !hasRatings) return 'unrated' // Only if no ratings
        break
    }
    
    console.log('❌ No valid transition found')
    return null
  }

  async updateTaskStatus(taskId, newStatus, targetStatus) {
    console.log(`🔄 Updating task ${taskId} status to ${newStatus}`)
    
    // Store reference to dragged task data before async operation
    const draggedTaskData = this.draggedTask
    
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
          console.log('✅ Task status updated successfully')
          
          // Use stored task data
          if (draggedTaskData && draggedTaskData.element) {
            // PREFER moving existing element to preserve event listeners and Stimulus controllers
            // Only use server HTML if explicitly needed for data consistency
            const shouldUseServerHTML = false // We'll keep the existing DOM for better functionality
            
            if (shouldUseServerHTML && data.task_html) {
              // Use updated HTML from server (this will break event listeners)
              this.replaceTaskWithUpdatedHTML(draggedTaskData.element, data.task_html, newStatus, draggedTaskData.currentStatus)
            } else {
              // Move existing element - this preserves all functionality
              this.moveTaskCardToSection(draggedTaskData.element, newStatus, draggedTaskData.currentStatus)
              
              // Update any status-dependent attributes or classes if needed
              if (data.task) {
                this.updateTaskCardData(draggedTaskData.element, data.task)
              }
            }
          } else {
            console.error('❌ Dragged task data or element is null')
          }
          
          // Update section counters
          this.updateSectionCounters()
          
          console.log(`🎉 Task moved from ${draggedTaskData?.currentStatus} to ${newStatus}`)
        } else {
          console.error('❌ Server returned success: false')
        }
      } else {
        console.error('❌ HTTP error:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('❌ Network error updating task status:', error)
    }
  }

  hasAllRatings(taskCard) {
    try {
      // Check if task has all required ratings
      const energySelect = taskCard.querySelector('select[name="task[energy]"]')
      const simplicitySelect = taskCard.querySelector('select[name="task[simplicity]"]')
      const impactSelect = taskCard.querySelector('select[name="task[impact]"]')
      
      if (!energySelect || !simplicitySelect || !impactSelect) {
        // If selects don't exist, check if task has score display (already rated)
        const scoreDisplay = taskCard.querySelector('.task-score-badge') || taskCard.querySelector('.score-container')
        return !!scoreDisplay
      }
      
      return !!(energySelect.value && simplicitySelect.value && impactSelect.value)
    } catch (error) {
      console.warn('Error checking ratings:', error)
      return false
    }
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

    // CRITICAL: Don't highlight unrated section for tasks with ratings
    if (targetStatus === 'unrated' && hasRatings) return false

    // For other cases, allow highlighting
    // The actual validation happens in getNewStatusForDrop
    return true
  }

  removeAllDropZoneHighlights() {
    this.dropZoneTargets.forEach(zone => {
      zone.classList.remove('drag-over', 'valid-drop-zone')
    })
  }

  showInvalidDropFeedback() {
    console.log('⚠️ Showing invalid drop feedback')
    // Could add visual feedback here
  }

  replaceTaskWithUpdatedHTML(taskCard, updatedHTML, newStatus, currentStatus) {
    if (!taskCard) {
      console.error('❌ Task card is null, cannot replace')
      return
    }

    console.log(`🔄 Replacing task card with updated HTML (${currentStatus} → ${newStatus})`)

    // Find the target section
    const targetSection = document.querySelector(`[data-status="${newStatus}"] .task-cards-container`)
    if (!targetSection) {
      console.error('❌ Target section not found for status:', newStatus)
      return
    }

    // Hide empty state in target section if it exists
    const targetEmptyState = targetSection.parentElement.querySelector('.section-empty-state')
    if (targetEmptyState) {
      targetEmptyState.style.display = 'none'
    }

    // Create a temporary container to parse the HTML
    const tempContainer = document.createElement('div')
    tempContainer.innerHTML = updatedHTML

    // Get the new task card element
    const newTaskCard = tempContainer.querySelector('.task-card')
    if (!newTaskCard) {
      console.error('❌ No task card found in updated HTML')
      return
    }

    // Get the parent wrapper that contains both task card and its wrapper
    const taskCardWrapper = taskCard.closest('.task-card-wrapper')
    
    // Remove the old task card wrapper (which includes the task card)
    if (taskCardWrapper) {
      taskCardWrapper.remove()
    } else {
      taskCard.remove()
    }

    // Parse the new HTML to get the complete structure
    const tempWrapper = document.createElement('div')
    tempWrapper.innerHTML = updatedHTML
    
    // Get the task-card-wrapper from the parsed HTML
    const newTaskCardWrapper = tempWrapper.querySelector('.task-card-wrapper')
    const newTaskCardOnly = tempWrapper.querySelector('.task-card')
    
    // Append the appropriate element (wrapper if available, card otherwise)
    if (newTaskCardWrapper) {
      targetSection.appendChild(newTaskCardWrapper)
    } else if (newTaskCardOnly) {
      targetSection.appendChild(newTaskCardOnly)
    } else {
      console.error('❌ No task card or wrapper found in updated HTML')
      return
    }

    // Check if source section is now empty and show empty state
    const sourceSection = document.querySelector(`[data-status="${currentStatus}"] .task-cards-container`)
    if (sourceSection && sourceSection.children.length === 0) {
      const sourceEmptyState = sourceSection.parentElement.querySelector('.section-empty-state')
      if (sourceEmptyState) {
        sourceEmptyState.style.display = 'block'
      }
    }

    // CRITICAL: Force Stimulus to reconnect controllers on the new elements
    // This ensures task-card controller and all nested controllers are properly initialized
    setTimeout(() => {
      const addedElement = newTaskCardWrapper || newTaskCardOnly
      if (addedElement) {
        // Use MutationObserver approach to trigger Stimulus
        const observer = new MutationObserver(() => {
          observer.disconnect()
        })
        
        // Trigger a mutation to let Stimulus know about the new element
        observer.observe(addedElement.parentElement, { childList: true })
        
        // Also dispatch turbo:render event which Stimulus listens to
        document.documentElement.dispatchEvent(new CustomEvent('turbo:render', { bubbles: true }))
      }
    }, 0) // Use setTimeout to ensure DOM is ready

    // Refresh drag and drop for the new element
    const dragController = document.querySelector('[data-controller*="drag-drop"]')
    if (dragController) {
      const event = new CustomEvent('refreshDragDrop')
      dragController.dispatchEvent(event)
    }

    console.log(`✅ Task replaced successfully from ${currentStatus} to ${newStatus}`)
  }

  moveTaskCardToSection(taskCard, newStatus, currentStatus) {
    if (!taskCard) {
      console.error('❌ Task card is null, cannot move')
      return
    }

    console.log(`🚚 Moving task card from ${currentStatus} to ${newStatus}`)

    // Find the target section
    const targetSection = document.querySelector(`[data-status="${newStatus}"] .task-cards-container`)
    if (!targetSection) {
      console.error('❌ Target section not found for status:', newStatus)
      return
    }

    // Get the wrapper element (parent of task card) to move the entire structure
    const taskCardWrapper = taskCard.closest('.task-card-wrapper')
    const elementToMove = taskCardWrapper || taskCard

    // Update task card's data-status attribute
    taskCard.dataset.status = newStatus

    // Hide empty state in target section if it exists
    const targetEmptyState = targetSection.parentElement.querySelector('.section-empty-state')
    if (targetEmptyState) {
      targetEmptyState.style.display = 'none'
    }

    // Move the entire task structure to the target section
    targetSection.appendChild(elementToMove)

    // Check if source section is now empty and show empty state
    const sourceSection = document.querySelector(`[data-status="${currentStatus}"] .task-cards-container`)
    if (sourceSection && sourceSection.children.length === 0) {
      const sourceEmptyState = sourceSection.parentElement.querySelector('.section-empty-state')
      if (sourceEmptyState) {
        sourceEmptyState.style.display = 'block'
      }
    }

    // Refresh drag and drop handlers for the moved element
    setTimeout(() => {
      this.refreshDragAndDrop()
    }, 0)

    console.log(`✅ Task moved successfully from ${currentStatus} to ${newStatus}`)
  }

  updateSectionCounters() {
    // Update counters for each section
    const sections = ['unrated', 'rated', 'parked', 'completed']
    
    sections.forEach(status => {
      const container = document.querySelector(`[data-status="${status}"] .task-cards-container`)
      const counter = document.querySelector(`[data-status="${status}"] .section-count`)
      
      if (container && counter) {
        const count = container.children.length
        const label = this.getCounterLabel(status)
        counter.textContent = `${count} ${label}`
      }
    })
  }

  getCounterLabel(status) {
    switch (status) {
      case 'unrated': return 'unfiltered'
      case 'rated': return 'prioritized'
      case 'parked': return 'parked'
      case 'completed': return 'completed'
      default: return ''
    }
  }

  updateTaskCardData(taskCard, taskData) {
    // Update data attributes that might have changed
    if (taskData.status) {
      taskCard.dataset.status = taskData.status
    }
    
    // Update any visual indicators that depend on status
    // For example, score display for rated tasks
    if (taskData.score !== undefined) {
      const scoreElement = taskCard.querySelector('.task-score-badge, .score-display')
      if (scoreElement) {
        scoreElement.textContent = taskData.score
      }
    }
    
    // Update any other relevant data attributes
    console.log('📝 Updated task card data attributes')
  }

  // Called when new tasks are added dynamically
  refreshDragAndDrop() {
    console.log('🔄 Refreshing drag and drop for new tasks')
    this.setupDragAndDrop()
  }
}