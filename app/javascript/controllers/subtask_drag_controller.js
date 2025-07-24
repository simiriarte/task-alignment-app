import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    subtaskId: String,
    parentTaskId: String,
    title: String
  }

  connect() {
    console.log('Subtask drag controller connected to handle:', this.element)
    
    // Bind event handlers
    this.dragStartHandler = this.dragStart.bind(this)
    this.dragEndHandler = this.dragEnd.bind(this)
    
    // The controller is now attached to the handle itself, which is draggable
    this.element.addEventListener('dragstart', this.dragStartHandler)
    this.element.addEventListener('dragend', this.dragEndHandler)
    
    // Visual feedback
    this.element.style.cursor = 'grab'
  }

  disconnect() {
    this.element.removeEventListener('dragstart', this.dragStartHandler)
    this.element.removeEventListener('dragend', this.dragEndHandler)
  }

  dragStart(event) {
    console.log('🚀 Subtask drag started from handle!', {
      subtaskId: this.subtaskIdValue,
      parentTaskId: this.parentTaskIdValue,
      title: this.titleValue
    })
    
    // Set dragging flag
    this.isDragging = true
    
    // Change cursor
    this.element.style.cursor = 'grabbing'
    
    // Add visual feedback to the subtask item (parent of handle)
    const subtaskItem = this.element.closest('.subtask-item')
    if (subtaskItem) {
      subtaskItem.classList.add('dragging')
    }
    document.body.classList.add('dragging-active')
    
    // Store subtask data in drag transfer
    const dragData = {
      type: 'subtask',
      subtaskId: this.subtaskIdValue,
      parentTaskId: this.parentTaskIdValue,
      title: this.titleValue
    }
    
    console.log('Setting drag data:', dragData)
    
    event.dataTransfer.setData('application/json', JSON.stringify(dragData))
    event.dataTransfer.effectAllowed = 'move'
    
    // Create drag image with subtask preview
    const dragImage = this.createDragImage()
    event.dataTransfer.setDragImage(dragImage, 10, 10)
    
    // Highlight valid drop zones
    this.highlightDropZones()
  }

  dragEnd(event) {
    console.log('✅ Subtask drag ended')
    
    // Clear dragging flag
    this.isDragging = false
    
    // Restore cursor
    this.element.style.cursor = 'grab'
    
    // Remove visual feedback from subtask item
    const subtaskItem = this.element.closest('.subtask-item')
    if (subtaskItem) {
      subtaskItem.classList.remove('dragging')
    }
    document.body.classList.remove('dragging-active')
    
    // Remove drop zone highlighting
    this.removeDropZoneHighlighting()
    
    // Clean up drag image
    const dragImage = document.querySelector('.subtask-drag-preview')
    if (dragImage) {
      dragImage.remove()
    }
  }

  createDragImage() {
    const dragImage = document.createElement('div')
    dragImage.className = 'subtask-drag-preview'
    dragImage.style.cssText = `
      position: absolute;
      top: -1000px;
      left: -1000px;
      width: 200px;
      padding: 8px 12px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 12px;
      color: #374151;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      pointer-events: none;
      z-index: 9999;
    `
    dragImage.textContent = `📋 ${this.titleValue}`
    
    document.body.appendChild(dragImage)
    return dragImage
  }

  highlightDropZones() {
    // Find Filter Tasks and Parked Tasks sections and highlight them
    const sectionTitles = document.querySelectorAll('.section-title')
    sectionTitles.forEach(title => {
      const titleText = title.textContent.trim()
      if (titleText.includes('Filter Tasks') || titleText.includes('Parked Tasks')) {
        const section = title.closest('.dashboard-section')
        if (section) {
          section.classList.add('valid-drop-zone')
          console.log(`Highlighted ${titleText} section as drop zone`)
        }
      }
    })
  }

  removeDropZoneHighlighting() {
    const dropZones = document.querySelectorAll('.valid-drop-zone, .drag-over')
    dropZones.forEach(zone => {
      zone.classList.remove('valid-drop-zone', 'drag-over')
    })
  }
}