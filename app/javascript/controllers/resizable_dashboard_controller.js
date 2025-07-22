import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["grid"]
  
  connect() {
    console.log("Resizable dashboard controller connected - height only mode")
    this.loadSavedRowHeights()
    this.initializeResizeHandles()
  }

  initializeResizeHandles() {
    // Find all dashboard sections and add vertical resize handles
    const sections = this.element.querySelectorAll('.dashboard-section')
    
    sections.forEach((section, index) => {
      // Only add resize handles to sections in the first row (top sections)
      if (index < 2) {
        this.addVerticalResizeHandle(section, index)
      }
    })
  }

  addVerticalResizeHandle(section, index) {
    // Check if handle already exists
    if (section.querySelector('.resize-handle-vertical')) return
    
    const handle = document.createElement('div')
    handle.className = 'resize-handle resize-handle-vertical'
    handle.dataset.section = index
    
    section.appendChild(handle)
    
    let isResizing = false
    let startY = 0
    let startHeight = 0
    
    handle.addEventListener('mousedown', (e) => {
      isResizing = true
      startY = e.clientY
      startHeight = section.offsetHeight
      
      document.body.style.cursor = 'row-resize'
      document.body.style.userSelect = 'none'
      
      e.preventDefault()
    })
    
    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return
      
      const deltaY = e.clientY - startY
      const newHeight = Math.max(220, Math.min(600, startHeight + deltaY))
      
      this.updateRowHeight(0, newHeight)
    })
    
    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        this.saveRowHeights()
      }
    })
  }

  updateRowHeight(row, height) {
    const grid = this.gridTarget
    const currentRows = getComputedStyle(grid).gridTemplateRows.split(' ')
    
    if (row === 0) {
      // Update first row height
      grid.style.setProperty('--row1-height', `${height}px`)
      grid.style.gridTemplateRows = `${height}px var(--row2-height, 320px)`
    } else if (row === 1) {
      // Update second row height  
      grid.style.setProperty('--row2-height', `${height}px`)
      grid.style.gridTemplateRows = `var(--row1-height, 320px) ${height}px`
    }
    
    // Update total grid height
    const row1Height = parseInt(grid.style.getPropertyValue('--row1-height') || '320')
    const row2Height = parseInt(grid.style.getPropertyValue('--row2-height') || '320')
    grid.style.height = `${row1Height + row2Height + 16}px` // +16 for gap
  }

  saveRowHeights() {
    const grid = this.gridTarget
    const row1Height = grid.style.getPropertyValue('--row1-height') || '280px'
    const row2Height = grid.style.getPropertyValue('--row2-height') || '280px'
    
    localStorage.setItem('dashboardRow1Height', row1Height)
    localStorage.setItem('dashboardRow2Height', row2Height)
    
    console.log('Saved row heights:', { row1Height, row2Height })
  }

  loadSavedRowHeights() {
    const row1Height = localStorage.getItem('dashboardRow1Height') || '320px'
    const row2Height = localStorage.getItem('dashboardRow2Height') || '320px'
    
    console.log('Loaded saved row heights:', { row1Height, row2Height })
    
    const grid = this.gridTarget
    grid.style.setProperty('--row1-height', row1Height)
    grid.style.setProperty('--row2-height', row2Height)
    grid.style.gridTemplateRows = `${row1Height} ${row2Height}`
    
    // Update total height
    const row1 = parseInt(row1Height)
    const row2 = parseInt(row2Height) 
    grid.style.height = `${row1 + row2 + 16}px`
  }
}