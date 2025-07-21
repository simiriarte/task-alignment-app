import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["grid", "section"]
  
  connect() {
    console.log("Resizable dashboard controller connected - height only mode")
    this.setupResizeHandles()
    this.loadSavedSizes()
    this.isResizing = false
    this.currentHandle = null
    this.startPos = { y: 0 }
    this.startHeight = 0
    this.rowIndex = 0
  }

  setupResizeHandles() {
    this.sectionTargets.forEach((section, index) => {
      // Only add vertical resize handles for height adjustment
      if (index === 0 || index === 1) {
        // Top row sections get vertical handles
        this.addResizeHandle(section, 'vertical', 1) // Row 1
      } else if (index === 2 || index === 3) {
        // Bottom row sections get vertical handles  
        this.addResizeHandle(section, 'vertical', 2) // Row 2
      }
    })
  }

  addResizeHandle(section, type, rowIndex) {
    const handle = document.createElement('div')
    handle.className = `resize-handle resize-handle-${type}`
    handle.dataset.handleType = type
    handle.dataset.rowIndex = rowIndex
    
    handle.addEventListener('mousedown', this.startResize.bind(this))
    section.appendChild(handle)
  }

  startResize(event) {
    event.preventDefault()
    this.isResizing = true
    this.currentHandle = event.target
    this.startPos = { y: event.clientY }
    this.rowIndex = parseInt(this.currentHandle.dataset.rowIndex)
    
    // Get current grid row height
    const gridStyle = getComputedStyle(this.gridTarget)
    const rows = gridStyle.gridTemplateRows.split(' ')
    this.startHeight = this.parseGridSize(rows[this.rowIndex - 1])

    document.addEventListener('mousemove', this.handleResize.bind(this))
    document.addEventListener('mouseup', this.endResize.bind(this))
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }

  handleResize(event) {
    if (!this.isResizing) return

    const deltaY = event.clientY - this.startPos.y
    const newHeight = Math.max(150, this.startHeight + deltaY) // Min 150px height
    const maxHeight = Math.min(1500, newHeight) // Max 1500px height
    
    // Apply new height to the grid row
    this.setRowHeight(this.rowIndex, maxHeight)
  }

  setRowHeight(rowIndex, height) {
    if (rowIndex === 1) {
      this.gridTarget.style.setProperty('--row1-height', `${height}px`)
    } else if (rowIndex === 2) {
      this.gridTarget.style.setProperty('--row2-height', `${height}px`)
    }
  }

  parseGridSize(sizeStr) {
    if (sizeStr.includes('px')) {
      return parseFloat(sizeStr)
    }
    // For fr units or other, calculate based on current container
    const gridRect = this.gridTarget.getBoundingClientRect()
    return gridRect.height / 2 // Default to half height for 1fr
  }

  endResize() {
    if (!this.isResizing) return
    
    this.isResizing = false
    this.currentHandle = null
    
    document.removeEventListener('mousemove', this.handleResize.bind(this))
    document.removeEventListener('mouseup', this.endResize.bind(this))
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    
    // Save current sizes
    this.saveSizes()
  }

  saveSizes() {
    const gridStyle = getComputedStyle(this.gridTarget)
    const sizes = {
      row1Height: gridStyle.getPropertyValue('--row1-height') || '1fr',
      row2Height: gridStyle.getPropertyValue('--row2-height') || '1fr'
    }
    
    localStorage.setItem('dashboardRowHeights', JSON.stringify(sizes))
    console.log('Saved row heights:', sizes)
  }

  loadSavedSizes() {
    const savedSizes = localStorage.getItem('dashboardRowHeights')
    if (savedSizes) {
      try {
        const sizes = JSON.parse(savedSizes)
        
        if (sizes.row1Height) {
          this.gridTarget.style.setProperty('--row1-height', sizes.row1Height)
        }
        if (sizes.row2Height) {
          this.gridTarget.style.setProperty('--row2-height', sizes.row2Height)
        }
        
        console.log('Loaded saved row heights:', sizes)
      } catch (error) {
        console.error('Error loading saved sizes:', error)
      }
    }
  }

  resetSizes() {
    // Reset to default row heights
    this.gridTarget.style.removeProperty('--row1-height')
    this.gridTarget.style.removeProperty('--row2-height')
    
    localStorage.removeItem('dashboardRowHeights')
    console.log('Reset dashboard to default row heights')
  }
}