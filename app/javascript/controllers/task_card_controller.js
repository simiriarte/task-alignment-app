import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "form", "titleInput", "dueDateInput", "cognitiveDensityInput", 
    "estimatedHoursInput"
  ]

  connect() {
    console.log("Task card controller connected")
    this.saveTimeout = null
    
    // Check if task is already marked as focus task and apply highlight
    const focusCheckbox = this.element.querySelector('.custom-checkbox')
    if (focusCheckbox && focusCheckbox.classList.contains('checked')) {
      this.element.classList.add('focus-task-active')
    }
  }

  disconnect() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }
  }

  selectAllText(event) {
    // Select all text when focused, especially for "New Task"
    setTimeout(() => {
      event.target.select()
    }, 10)
  }

  // Auto-save with debouncing
  autoSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }
    
    this.saveTimeout = setTimeout(() => {
      this.submitForm()
    }, 1000) // Save after 1 second of inactivity
  }

  async submitForm(event) {
    if (event) {
      event.preventDefault()
    }

    try {
      const formData = new FormData(this.formTarget)
      
      // Clean the due_date value - extract just the date part without "due: "
      const dueDateValue = formData.get('task[due_date]')
      if (dueDateValue && dueDateValue.startsWith('due: ')) {
        const cleanedDate = dueDateValue.replace('due: ', '').trim()
        formData.set('task[due_date]', cleanedDate || '')
      }
      
      const response = await fetch(this.formTarget.action, {
        method: 'PATCH',
        body: formData,
        headers: {
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          this.showSaveIndicator()
          
          // Update all counters if counts are provided (status may have changed)
          if (data.counts && window.DashboardCounters) {
            window.DashboardCounters.updateCounters(data.counts)
          }
        }
      }
    } catch (error) {
      console.error("Error saving task:", error)
    }
  }

  async duplicateTask(event) {
    event.preventDefault()
    
    try {
      const taskId = this.element.dataset.taskId
      const response = await fetch(`/tasks/${taskId}/duplicate`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Insert the duplicated task after this one
          this.element.insertAdjacentHTML('afterend', data.task_html)
          this.showSuccessMessage("Task duplicated successfully")
        }
      }
    } catch (error) {
      console.error("Error duplicating task:", error)
      this.showError("Failed to duplicate task")
    }
  }

  cycleCognitiveDensity(event) {
    event.preventDefault()
    
    const circle = event.target
    
    // Get current level from CSS class (default to 0 if no level class found)
    let currentLevel = 0
    for (let i = 1; i <= 3; i++) {
      if (circle.classList.contains(`level-${i}`)) {
        currentLevel = i
        break
      }
    }
    
    // Cycle: blank(0) -> level-1 -> level-2 -> level-3 -> blank(0)
    const nextLevel = currentLevel === 3 ? 0 : currentLevel + 1
    
    // Remove all level classes
    for (let i = 1; i <= 3; i++) {
      circle.classList.remove(`level-${i}`)
    }
    
    // Add new level class (only if not going back to blank)
    if (nextLevel > 0) {
      circle.classList.add(`level-${nextLevel}`)
    }
    
    // Update hidden field
    if (this.hasCognitiveDensityInputTarget) {
      this.cognitiveDensityInputTarget.value = nextLevel
    }
    
    // Auto-save
    this.autoSave()
  }

  setEstimatedHours(event) {
    event.preventDefault()
    
    const hours = parseInt(event.target.dataset.hours)
    const currentValue = this.hasEstimatedHoursInputTarget ? parseInt(this.estimatedHoursInputTarget.value) || 0 : 0
    
    // If clicking on the same value, deselect (set to 0)
    const newHours = (currentValue === hours) ? 0 : hours
    
    // Update all hour buttons to show the progressive fill
    this.element.querySelectorAll('.hour-btn').forEach((btn, index) => {
      if (index < newHours) {
        btn.classList.add('active')
      } else {
        btn.classList.remove('active')
      }
    })
    
    // Update hidden field
    if (this.hasEstimatedHoursInputTarget) {
      this.estimatedHoursInputTarget.value = newHours
    }
    
    // Auto-save
    this.autoSave()
  }

  async deleteTask(event) {
    event.preventDefault()

    try {
      const taskId = this.element.dataset.taskId
      
      // Store the current DOM element HTML and position for potential undo
      const wrapper = this.element.closest('.task-card-wrapper')
      const elementToStore = wrapper || this.element
      const taskHtml = elementToStore.outerHTML
      const nextElement = elementToStore.nextElementSibling
      const parentElement = elementToStore.parentElement
      
      const response = await fetch(`/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Remove the entire wrapper (or just the task card if no wrapper)
          const wrapper = this.element.closest('.task-card-wrapper')
          const elementToRemove = wrapper || this.element
          elementToRemove.remove()
          
          // Update all counters if counts are provided
          if (data.counts && window.DashboardCounters) {
            window.DashboardCounters.updateCounters(data.counts)
          }
          
          // Store undo data for the global undo system
          if (window.TaskUndoManager) {
            window.TaskUndoManager.addDeletion({
              taskData: data.task_data,
              taskHtml: taskHtml,
              parentElement: parentElement,
              nextElement: nextElement
            })
          }
          
          // Notify parent controller about deletion
          this.notifyParentOfDeletion()
        }
      }
    } catch (error) {
      console.error("Error deleting task:", error)
      this.showError("Failed to delete task")
    }
  }

  toggleComplete(event) {
    event.preventDefault()
    
    const isCompleted = event.target.dataset.completed === "true"
    const newStatus = isCompleted ? "unrated" : "completed"
    
    // Update the visual state immediately
    event.target.dataset.completed = (!isCompleted).toString()
    
    // Save the change
    this.updateTaskStatus(newStatus)
  }


  async updateTaskStatus(status) {
    try {
      const taskId = this.element.dataset.taskId
      const formData = new FormData()
      formData.append('task[status]', status)
      
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
        const data = await response.json()
        if (data.success) {
          this.showSaveIndicator()
          
          // Update all counters if counts are provided (status may have changed)
          if (data.counts && window.DashboardCounters) {
            window.DashboardCounters.updateCounters(data.counts)
          }
          
          // If status changed to 'rated', 'parked', or 'unrated', remove the card from the current section
          if (status === 'rated' || status === 'parked' || status === 'unrated') {
            this.fadeOutAndRemove()
            
            // For unrated tasks, reload the page to show task in filter section
            if (status === 'unrated') {
              setTimeout(() => {
                window.location.reload()
              }, 500)
            }
          }
        }
      }
    } catch (error) {
      console.error("Error updating task status:", error)
    }
  }
  
  fadeOutAndRemove() {
    // Add fade out animation
    this.element.style.transition = 'all 0.3s ease'
    this.element.style.opacity = '0'
    this.element.style.transform = 'translateX(20px)'
    
    // Remove element after animation
    setTimeout(() => {
      this.element.remove()
      
      // Notify parent controller about task removal
      this.notifyParentOfDeletion()
      
      // Refresh the page to show the task in the prioritized section
      // TODO: In the future, we could dynamically add the task to the prioritized section
      setTimeout(() => {
        window.location.reload()
      }, 500)
    }, 300)
  }

  parkTask(event) {
    event.preventDefault()
    
    // Store undo information before changing status
    const taskId = this.element.dataset.taskId
    const currentStatus = this.element.dataset.status
    const taskHTML = this.element.outerHTML
    
    // Determine the target status based on current status
    let targetStatus
    if (currentStatus === 'parked') {
      // If currently parked, check if it has ratings to determine where to send it
      const hasRatings = this.hasAllRatings()
      targetStatus = hasRatings ? 'rated' : 'unrated'
      
      this.storeUndoAction('unpark', {
        taskId: taskId,
        previousStatus: currentStatus,
        taskHTML: taskHTML,
        parentSection: this.element.closest('.dashboard-section')
      })
    } else {
      // If not parked, park it
      targetStatus = 'parked'
      this.storeUndoAction('park', {
        taskId: taskId,
        previousStatus: currentStatus,
        taskHTML: taskHTML,
        parentSection: this.element.closest('.dashboard-section')
      })
    }
    
    this.updateTaskStatus(targetStatus)
  }

  moveToRated(event) {
    event.preventDefault()
    
    // Check if task has all required ratings
    if (this.hasAllRatings()) {
      // Store undo information before changing status
      const taskId = this.element.dataset.taskId
      const currentStatus = this.element.dataset.status
      const taskHTML = this.element.outerHTML
      
      this.storeUndoAction('rate', {
        taskId: taskId,
        previousStatus: currentStatus,
        taskHTML: taskHTML,
        parentSection: this.element.closest('.dashboard-section')
      })
      
      // Calculate the score and update status
      const score = this.calculateScore()
      this.updateTaskStatus('rated')
    } else {
      this.highlightMissingRatings()
    }
  }
  
  calculateScore() {
    const energySelect = this.element.querySelector('select[name="task[energy]"]')
    const simplicitySelect = this.element.querySelector('select[name="task[simplicity]"]')
    const impactSelect = this.element.querySelector('select[name="task[impact]"]')
    
    const energy = parseFloat(energySelect.value) || 0
    const simplicity = parseFloat(simplicitySelect.value) || 0
    const impact = parseFloat(impactSelect.value) || 0
    
    // Calculate score using simple addition: energy + simplicity + impact
    return energy + simplicity + impact
  }

  hasAllRatings() {
    const energySelect = this.element.querySelector('select[name="task[energy]"]')
    const simplicitySelect = this.element.querySelector('select[name="task[simplicity]"]')
    const impactSelect = this.element.querySelector('select[name="task[impact]"]')
    
    const energy = energySelect ? energySelect.value : null
    const simplicity = simplicitySelect ? simplicitySelect.value : null
    const impact = impactSelect ? impactSelect.value : null
    
    return energy && simplicity && impact
  }

  toggleExpanded(event) {
    event.preventDefault()
    this.element.classList.toggle('expanded')
  }


  showSaveIndicator() {
    // No visual indicator needed - changes save automatically
  }

  showSuccessMessage(message) {
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

  notifyParentOfDeletion() {
    // Find the parent filter-tasks controller and notify it
    const filterTasksController = this.application.getControllerForElementAndIdentifier(
      document.querySelector('[data-controller*="filter-tasks"]'), 
      'filter-tasks'
    )
    
    if (filterTasksController) {
      filterTasksController.taskDeleted()
    }
  }

  handleDateFieldFocus(event) {
    const input = event.target
    const value = input.value
    
    // If the field only contains "due: ", position cursor at the end
    if (value === "due: ") {
      setTimeout(() => {
        input.setSelectionRange(5, 5)
      }, 0)
    }
  }

  validateDateInput(event) {
    const input = event.target
    const currentValue = input.value
    
    // Ensure the field always starts with "due: "
    if (!currentValue.startsWith("due: ")) {
      event.preventDefault()
      input.value = "due: "
      input.setSelectionRange(5, 5)
      return
    }
    
    // Allow control keys
    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 
      'Home', 'End', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Clear', 'Cut', 'Copy', 'Paste'
    ]
    
    // Allow meta keys (Cmd on Mac, Ctrl on PC) for copy/paste
    if (event.metaKey || event.ctrlKey) {
      return
    }
    
    if (allowedKeys.includes(event.key)) {
      // Prevent deleting the "due: " prefix
      if ((event.key === 'Backspace' || event.key === 'Delete') && 
          input.selectionStart <= 5) {
        event.preventDefault()
        input.setSelectionRange(5, 5)
      }
      return
    }
    
    // Only allow numbers and forward slash after "due: "
    if (!/^[0-9\/]$/.test(event.key)) {
      event.preventDefault()
      return
    }
    
    // Prevent more than "due: MM/DD" (10 characters total)
    if (currentValue.length >= 10 && !allowedKeys.includes(event.key)) {
      event.preventDefault()
      return
    }
    
    // Auto-format after the key is processed
    setTimeout(() => {
      this.ensureDuePrefixAndFormat(input)
    }, 0)
  }

  ensureDuePrefixAndFormat(input) {
    let value = input.value
    
    // Ensure we always have the prefix
    if (!value.startsWith("due: ")) {
      value = "due: " + value.replace(/^due:\s*/, '')
    }
    
    // Extract just the date part for formatting
    const datePartMatch = value.match(/due:\s*(.*)/)
    const datePart = datePartMatch ? datePartMatch[1] : ''
    const cleanValue = datePart.replace(/\D/g, '')
    
    // Auto-add slash after month
    let formattedDate = ''
    if (cleanValue.length >= 2) {
      formattedDate = cleanValue.slice(0, 2) + '/' + cleanValue.slice(2, 4)
    } else {
      formattedDate = cleanValue
    }
    
    // Update the input value
    const newValue = 'due: ' + formattedDate
    if (input.value !== newValue) {
      const cursorPos = input.selectionStart
      input.value = newValue
      
      // Try to maintain cursor position relative to the date part
      const newCursorPos = Math.min(cursorPos, newValue.length)
      input.setSelectionRange(newCursorPos, newCursorPos)
    }
  }

  handleDateInput(event) {
    const input = event.target
    // Use a short delay to let the input event complete, then ensure formatting
    setTimeout(() => {
      this.ensureDuePrefixAndFormat(input)
    }, 10)
  }

  handleDatePaste(event) {
    const input = event.target
    // Prevent default paste behavior and handle it manually
    event.preventDefault()
    
    // Get pasted content
    const pastedText = (event.clipboardData || window.clipboardData).getData('text')
    
    // Clean the pasted text (remove any existing "due:" and extract numbers/slashes)
    const cleanText = pastedText.replace(/^due:\s*/, '').replace(/[^\d\/]/g, '')
    
    // Get current cursor position (ensure it's after "due: ")
    const cursorPos = Math.max(input.selectionStart, 5)
    const currentValue = input.value
    
    // Insert the cleaned text after "due: "
    const beforeCursor = currentValue.substring(0, cursorPos)
    const afterCursor = currentValue.substring(input.selectionEnd)
    
    // Combine and ensure we keep the "due: " prefix
    let newValue = beforeCursor + cleanText + afterCursor
    if (!newValue.startsWith("due: ")) {
      newValue = "due: " + newValue.replace(/^due:\s*/, '')
    }
    
    input.value = newValue
    
    // Format the result
    setTimeout(() => {
      this.ensureDuePrefixAndFormat(input)
    }, 10)
  }

  showDatePicker(event) {
    event.preventDefault()
    event.stopPropagation() // Prevent event bubbling
    console.log("Calendar icon clicked")
    
    // Remove any existing calendar modal
    const existingModal = document.querySelector('.calendar-modal')
    if (existingModal) {
      existingModal.remove()
    }
    
    // Get the date input position for positioning
    const dateInput = this.dueDateInputTarget.parentElement
    const rect = dateInput.getBoundingClientRect()
    
    // Create calendar modal
    const calendarModal = document.createElement('div')
    calendarModal.className = 'calendar-modal'
    calendarModal.innerHTML = this.generateCalendarHTML()
    
    // Position the modal
    calendarModal.style.position = 'fixed'
    calendarModal.style.top = `${rect.bottom + 5}px`
    calendarModal.style.left = `${rect.left}px`
    calendarModal.style.zIndex = '9999'
    
    // Add to DOM
    document.body.appendChild(calendarModal)
    
    // Add event listeners
    this.setupCalendarEvents(calendarModal)
    
    // Close on click outside - use a longer delay to ensure the modal is fully created
    setTimeout(() => {
      document.addEventListener('click', this.handleClickOutside.bind(this, calendarModal), { once: true })
    }, 100)
  }
  
  generateCalendarHTML() {
    const currentDate = new Date()
    const currentValue = this.dueDateInputTarget.value
    let selectedDate = null
    
    // Parse current value if it exists (extract date part after "due: ")
    if (currentValue && currentValue.startsWith("due: ")) {
      const dateString = currentValue.replace("due: ", "").trim()
      const dateParts = dateString.split('/')
      if (dateParts.length >= 2) {
        const month = parseInt(dateParts[0]) - 1 // Month is 0-indexed
        const day = parseInt(dateParts[1])
        const year = dateParts[2] ? parseInt(dateParts[2]) : currentDate.getFullYear()
        selectedDate = new Date(year, month, day)
      }
    }
    
    const displayDate = selectedDate || currentDate
    const year = displayDate.getFullYear()
    const month = displayDate.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay()) // Start from Sunday
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    
    let html = `
      <div class="calendar-header">
        <button type="button" class="calendar-nav-btn" data-action="prev-month">&lt;</button>
        <span class="calendar-month-year">${monthNames[month]} ${year}</span>
        <button type="button" class="calendar-nav-btn" data-action="next-month">&gt;</button>
      </div>
      <div class="calendar-grid">
        <div class="calendar-weekdays">
          <div class="calendar-weekday">Su</div>
          <div class="calendar-weekday">Mo</div>
          <div class="calendar-weekday">Tu</div>
          <div class="calendar-weekday">We</div>
          <div class="calendar-weekday">Th</div>
          <div class="calendar-weekday">Fr</div>
          <div class="calendar-weekday">Sa</div>
        </div>
        <div class="calendar-days">
    `
    
    // Generate 6 weeks of days
    for (let week = 0; week < 6; week++) {
      for (let day = 0; day < 7; day++) {
        const currentDay = new Date(startDate)
        currentDay.setDate(startDate.getDate() + (week * 7) + day)
        
        const isCurrentMonth = currentDay.getMonth() === month
        const isSelected = selectedDate && 
          currentDay.getDate() === selectedDate.getDate() &&
          currentDay.getMonth() === selectedDate.getMonth() &&
          currentDay.getFullYear() === selectedDate.getFullYear()
        const isToday = currentDay.toDateString() === currentDate.toDateString()
        
        let dayClasses = ['calendar-day']
        if (!isCurrentMonth) dayClasses.push('calendar-day-other-month')
        if (isSelected) dayClasses.push('calendar-day-selected')
        if (isToday) dayClasses.push('calendar-day-today')
        
        html += `
          <button type="button" 
                  class="${dayClasses.join(' ')}" 
                  data-date="${currentDay.toISOString().split('T')[0]}"
                  data-display-date="${currentDay.getMonth() + 1}/${currentDay.getDate()}/${currentDay.getFullYear()}">
            ${currentDay.getDate()}
          </button>
        `
      }
    }
    
    html += `
        </div>
      </div>
      <div class="calendar-footer">
        <button type="button" class="calendar-clear-btn">Clear</button>
        <button type="button" class="calendar-today-btn">Today</button>
      </div>
    `
    
    return html
  }
  
  setupCalendarEvents(calendarModal) {
    // Date selection
    calendarModal.addEventListener('click', (event) => {
      if (event.target.classList.contains('calendar-day') && !event.target.classList.contains('calendar-day-other-month')) {
        const displayDate = event.target.dataset.displayDate
        // Extract MM/DD part only (remove year)
        const dateParts = displayDate.split('/')
        const monthDay = `${dateParts[0]}/${dateParts[1]}`
        this.dueDateInputTarget.value = `due: ${monthDay}`
        this.autoSave()
        calendarModal.remove()
      }
      
      // Navigation buttons
      if (event.target.classList.contains('calendar-nav-btn')) {
        const action = event.target.dataset.action
        this.navigateCalendar(calendarModal, action)
      }
      
      // Footer buttons
      if (event.target.classList.contains('calendar-clear-btn')) {
        this.dueDateInputTarget.value = 'due: '
        this.autoSave()
        calendarModal.remove()
      }
      
      if (event.target.classList.contains('calendar-today-btn')) {
        const today = new Date()
        const todayString = `${today.getMonth() + 1}/${today.getDate()}`
        this.dueDateInputTarget.value = `due: ${todayString}`
        this.autoSave()
        calendarModal.remove()
      }
    })
  }
  
  navigateCalendar(calendarModal, action) {
    const monthYearSpan = calendarModal.querySelector('.calendar-month-year')
    const currentText = monthYearSpan.textContent
    const [monthName, year] = currentText.split(' ')
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    
    let currentMonth = monthNames.indexOf(monthName)
    let currentYear = parseInt(year)
    
    if (action === 'prev-month') {
      currentMonth--
      if (currentMonth < 0) {
        currentMonth = 11
        currentYear--
      }
    } else if (action === 'next-month') {
      currentMonth++
      if (currentMonth > 11) {
        currentMonth = 0
        currentYear++
      }
    }
    
    // Update the calendar display
    const newDate = new Date(currentYear, currentMonth, 1)
    calendarModal.innerHTML = this.generateCalendarHTMLForDate(newDate)
    this.setupCalendarEvents(calendarModal)
  }
  
  generateCalendarHTMLForDate(date) {
    // Store current value temporarily
    const originalValue = this.dueDateInputTarget.value
    
    // Create a temporary date to generate calendar for specific month/year
    const tempCurrentDate = new Date()
    const year = date.getFullYear()
    const month = date.getMonth()
    
    let selectedDate = null
    if (originalValue && originalValue.startsWith("due: ")) {
      const dateString = originalValue.replace("due: ", "").trim()
      const dateParts = dateString.split('/')
      if (dateParts.length >= 2) {
        const selectedMonth = parseInt(dateParts[0]) - 1
        const selectedDay = parseInt(dateParts[1])
        const selectedYear = dateParts[2] ? parseInt(dateParts[2]) : tempCurrentDate.getFullYear()
        selectedDate = new Date(selectedYear, selectedMonth, selectedDay)
      }
    }
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    
    let html = `
      <div class="calendar-header">
        <button type="button" class="calendar-nav-btn" data-action="prev-month">&lt;</button>
        <span class="calendar-month-year">${monthNames[month]} ${year}</span>
        <button type="button" class="calendar-nav-btn" data-action="next-month">&gt;</button>
      </div>
      <div class="calendar-grid">
        <div class="calendar-weekdays">
          <div class="calendar-weekday">Su</div>
          <div class="calendar-weekday">Mo</div>
          <div class="calendar-weekday">Tu</div>
          <div class="calendar-weekday">We</div>
          <div class="calendar-weekday">Th</div>
          <div class="calendar-weekday">Fr</div>
          <div class="calendar-weekday">Sa</div>
        </div>
        <div class="calendar-days">
    `
    
    for (let week = 0; week < 6; week++) {
      for (let day = 0; day < 7; day++) {
        const currentDay = new Date(startDate)
        currentDay.setDate(startDate.getDate() + (week * 7) + day)
        
        const isCurrentMonth = currentDay.getMonth() === month
        const isSelected = selectedDate && 
          currentDay.getDate() === selectedDate.getDate() &&
          currentDay.getMonth() === selectedDate.getMonth() &&
          currentDay.getFullYear() === selectedDate.getFullYear()
        const isToday = currentDay.toDateString() === tempCurrentDate.toDateString()
        
        let dayClasses = ['calendar-day']
        if (!isCurrentMonth) dayClasses.push('calendar-day-other-month')
        if (isSelected) dayClasses.push('calendar-day-selected')
        if (isToday) dayClasses.push('calendar-day-today')
        
        html += `
          <button type="button" 
                  class="${dayClasses.join(' ')}" 
                  data-date="${currentDay.toISOString().split('T')[0]}"
                  data-display-date="${currentDay.getMonth() + 1}/${currentDay.getDate()}/${currentDay.getFullYear()}">
            ${currentDay.getDate()}
          </button>
        `
      }
    }
    
    html += `
        </div>
      </div>
      <div class="calendar-footer">
        <button type="button" class="calendar-clear-btn">Clear</button>
        <button type="button" class="calendar-today-btn">Today</button>
      </div>
    `
    
    return html
  }
  
  handleClickOutside(calendarModal, event) {
    if (!calendarModal.contains(event.target) && !event.target.closest('.calendar-icon')) {
      calendarModal.remove()
    }
  }

  toggleFocusTask(event) {
    event.preventDefault()
    
    // Find the button element (in case we clicked on the icon inside)
    const checkbox = event.target.closest('.custom-checkbox')
    const isChecked = checkbox.classList.contains('checked')
    const focusField = this.element.querySelector('input[name="task[is_focus_task]"]')
    
    // Toggle the visual state
    if (isChecked) {
      // Currently checked, so uncheck it
      checkbox.classList.remove('checked')
      this.element.classList.remove('focus-task-active')
      if (focusField) focusField.value = '0'
    } else {
      // Currently unchecked, so check it
      checkbox.classList.add('checked')
      this.element.classList.add('focus-task-active')
      if (focusField) focusField.value = '1'
    }
    
    // Auto-save
    this.autoSave()
  }

  editDueDate(event) {
    const span = event.target
    const currentDate = span.dataset.currentDate
    
    // Create input field
    const input = document.createElement('input')
    input.type = 'text'
    input.value = currentDate
    input.className = 'due-date-edit-input'
    input.style.cssText = `
      font-size: 12px;
      font-weight: 500;
      color: #0097f2;
      border: 1px solid #0097f2;
      border-radius: 4px;
      padding: 2px 6px;
      background: white;
      width: 60px;
    `
    
    // Replace span with input
    span.style.display = 'none'
    span.parentElement.appendChild(input)
    input.focus()
    input.select()
    
    // Handle save on blur or enter
    const saveEdit = () => {
      const newValue = input.value.trim()
      if (this.isValidDateFormat(newValue)) {
        // Update the task
        this.updateDueDate(newValue)
        span.textContent = `due: ${newValue}`
        span.dataset.currentDate = newValue
      }
      // Restore original display
      input.remove()
      span.style.display = ''
    }
    
    // Add input validation for numbers only
    input.addEventListener('input', (e) => {
      this.validateDateFormat(e)
    })
    
    input.addEventListener('keydown', (e) => {
      // Allow: backspace, delete, tab, escape, enter, and arrow keys
      const allowedKeys = [
        'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'
      ]
      
      if (e.key === 'Enter') {
        e.preventDefault()
        saveEdit()
      } else if (e.key === 'Escape') {
        input.remove()
        span.style.display = ''
      } else if (!allowedKeys.includes(e.key) && !/^\d$/.test(e.key)) {
        // Block any key that isn't a number or allowed control key
        e.preventDefault()
      }
    })
    
    input.addEventListener('blur', saveEdit)
  }

  validateDateFormat(event) {
    const input = event.target
    let value = input.value
    
    // Remove any non-numeric characters except forward slash
    value = value.replace(/[^\d\/]/g, '')
    
    // Auto-format: add slash after 2 digits if not present
    if (value.length === 2 && !value.includes('/')) {
      value = value + '/'
    }
    
    // Limit to MM/DD format (5 characters max)
    if (value.length > 5) {
      value = value.substring(0, 5)
    }
    
    input.value = value
  }

  isValidDateFormat(dateString) {
    // Check MM/DD format
    const regex = /^\d{1,2}\/\d{1,2}$/
    if (!regex.test(dateString)) return false
    
    const [month, day] = dateString.split('/').map(Number)
    return month >= 1 && month <= 12 && day >= 1 && day <= 31
  }

  async updateDueDate(dateValue) {
    try {
      const taskId = this.element.dataset.taskId
      const formData = new FormData()
      formData.append('task[due_date]', dateValue)
      
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
        const data = await response.json()
        if (data.success) {
          this.showSaveIndicator()
        }
      }
    } catch (error) {
      console.error("Error updating due date:", error)
    }
  }

  toggleNotes(event) {
    event.preventDefault()
    
    // Check if notes section already exists
    let notesSection = this.element.querySelector('.task-notes-section')
    
    if (notesSection) {
      // Notes section exists, toggle it
      if (notesSection.style.display === 'none') {
        notesSection.style.display = 'block'
        this.element.classList.add('expanded')
      } else {
        notesSection.style.display = 'none'
        this.element.classList.remove('expanded')
      }
    } else {
      // Create notes section
      notesSection = document.createElement('div')
      notesSection.className = 'task-notes-section'
      notesSection.innerHTML = `
        <textarea class="notes-textarea" 
                  placeholder="Add notes for this task..."
                  data-action="blur->task-card#saveNotes"></textarea>
        <div class="notes-close-section">
          <button type="button" class="notes-close-btn" 
                  data-action="click->task-card#closeNotes"
                  title="Save and close notes">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 14l5-5 5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      `
      
      // Insert after the bottom section
      const bottomSection = this.element.querySelector('.task-card-bottom')
      bottomSection.parentElement.insertBefore(notesSection, bottomSection.nextSibling)
      
      // Add expanded class to card
      this.element.classList.add('expanded')
      
      // Focus on textarea
      setTimeout(() => {
        notesSection.querySelector('.notes-textarea').focus()
      }, 100)
    }
  }

  async saveNotes(event) {
    const textarea = event.target
    const notes = textarea.value
    
    try {
      const taskId = this.element.dataset.taskId
      const formData = new FormData()
      formData.append('task[notes]', notes)
      
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
        const data = await response.json()
        if (data.success) {
          this.showSaveIndicator()
        }
      }
    } catch (error) {
      console.error("Error saving notes:", error)
    }
  }

  closeNotes(event) {
    event.preventDefault()
    
    // Save notes first
    const notesSection = this.element.querySelector('.task-notes-section')
    const textarea = notesSection.querySelector('.notes-textarea')
    
    if (textarea.value.trim()) {
      // Trigger save if there's content
      this.saveNotes({ target: textarea })
    }
    
    // Hide notes section
    notesSection.style.display = 'none'
    this.element.classList.remove('expanded')
  }

  async completeTask(event) {
    event.preventDefault()
    
    try {
      const taskId = this.element.dataset.taskId
      const currentStatus = this.element.dataset.status
      const taskHTML = this.element.outerHTML
      
      // Store undo information
      this.storeUndoAction('complete', {
        taskId: taskId,
        previousStatus: currentStatus,
        taskHTML: taskHTML,
        parentSection: this.element.closest('.dashboard-section')
      })
      
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
            status: 'completed'
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Remove task card from current section
          this.element.remove()
          
          // Update counters if available
          if (data.counts && window.DashboardCounters) {
            window.DashboardCounters.updateCounters(data.counts)
          }
          
          // Reload page to show task in completed section
          setTimeout(() => {
            window.location.reload()
          }, 500)
        }
      }
    } catch (error) {
      console.error('Error completing task:', error)
    }
  }

  storeUndoAction(action, data) {
    if (!window.UndoManager) {
      window.UndoManager = {
        actions: [],
        maxActions: 10
      }
    }
    
    window.UndoManager.actions.push({
      action: action,
      data: data,
      timestamp: Date.now()
    })
    
    // Keep only the last 10 actions
    if (window.UndoManager.actions.length > window.UndoManager.maxActions) {
      window.UndoManager.actions.shift()
    }
  }

  highlightMissingRatings() {
    const energySelect = this.element.querySelector('select[name="task[energy]"]')
    const simplicitySelect = this.element.querySelector('select[name="task[simplicity]"]')
    const impactSelect = this.element.querySelector('select[name="task[impact]"]')
    
    // Add red border to fields that are missing values
    if (!energySelect.value) {
      energySelect.style.borderColor = '#ef4444'
    }
    if (!simplicitySelect.value) {
      simplicitySelect.style.borderColor = '#ef4444'
    }
    if (!impactSelect.value) {
      impactSelect.style.borderColor = '#ef4444'
    }
    
    // Remove red border after 3 seconds
    setTimeout(() => {
      energySelect.style.borderColor = ''
      simplicitySelect.style.borderColor = ''
      impactSelect.style.borderColor = ''
    }, 3000)
  }

} 