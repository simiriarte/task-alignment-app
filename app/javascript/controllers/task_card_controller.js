import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "form", "titleInput", "dueDateInput", "energyInput", 
    "simplicityInput", "impactInput", "estimatedHoursInput", 
    "focusTaskInput"
  ]

  connect() {
    console.log("Task card controller connected")
    this.saveTimeout = null
  }

  disconnect() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }
  }

  selectAllText(event) {
    // Select all text when focused, especially for "Untitled Task"
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

  async deleteTask(event) {
    event.preventDefault()

    try {
      const taskId = this.element.dataset.taskId
      
      // Store the current DOM element HTML and position for potential undo
      const taskHtml = this.element.outerHTML
      const nextElement = this.element.nextElementSibling
      const parentElement = this.element.parentElement
      
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
          // Remove the task card from DOM
          this.element.remove()
          
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
          
          this.showSuccessMessage("Task deleted (Ctrl+Z to undo)")
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

  setEstimatedHours(event) {
    event.preventDefault()
    
    const hours = parseInt(event.target.dataset.hours)
    
    // Update all time buttons
    this.element.querySelectorAll('.time-btn').forEach(btn => {
      btn.classList.remove('active')
    })
    
    // Mark this button as active
    event.target.classList.add('active')
    
    // Update hidden field
    if (this.hasEstimatedHoursInputTarget) {
      this.estimatedHoursInputTarget.value = hours
    }
    
    // Auto-save
    this.autoSave()
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
        }
      }
    } catch (error) {
      console.error("Error updating task status:", error)
    }
  }

  parkTask(event) {
    event.preventDefault()
    this.updateTaskStatus('parked')
    this.showSuccessMessage("Task parked")
  }

  moveToRated(event) {
    event.preventDefault()
    
    // Check if task has all required ratings
    if (this.hasAllRatings()) {
      this.updateTaskStatus('rated')
      this.showSuccessMessage("Task moved to rated")
    } else {
      this.showError("Please add energy, simplicity, and impact ratings first")
    }
  }

  hasAllRatings() {
    const energy = this.hasEnergyInputTarget ? this.energyInputTarget.value : null
    const simplicity = this.hasSimplicityInputTarget ? this.simplicityInputTarget.value : null
    const impact = this.hasImpactInputTarget ? this.impactInputTarget.value : null
    
    return energy && simplicity && impact
  }

  toggleExpanded(event) {
    event.preventDefault()
    this.element.classList.toggle('expanded')
  }

  addSubtask(event) {
    event.preventDefault()
    // This could be implemented later for subtask functionality
    this.showSuccessMessage("Subtask functionality coming soon!")
  }

  showSaveIndicator() {
    // Briefly flash the card border to indicate save
    this.element.style.borderLeft = '4px solid #10b981'
    setTimeout(() => {
      this.element.style.borderLeft = '4px solid #9ca3af'
    }, 1000)
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
} 