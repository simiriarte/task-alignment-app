import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["unratedCounter", "ratedCounter", "parkedCounter", "completedCounter"]
  
  connect() {
    console.log("Dashboard counters controller connected")
    // Store reference for global access
    window.DashboardCounters = this
  }
  
  disconnect() {
    // Clean up global reference
    if (window.DashboardCounters === this) {
      window.DashboardCounters = null
    }
  }
  
  updateCounters(counts) {
    if (counts.unrated_count !== undefined && this.hasUnratedCounterTarget) {
      this.unratedCounterTarget.textContent = `${counts.unrated_count} unfiltered`
    }
    
    if (counts.rated_count !== undefined && this.hasRatedCounterTarget) {
      this.ratedCounterTarget.textContent = `${counts.rated_count} prioritized`
      this.updateSectionDimming('prioritized-tasks', counts.rated_count)
    }
    
    if (counts.parked_count !== undefined && this.hasParkedCounterTarget) {
      this.parkedCounterTarget.textContent = `${counts.parked_count} parked`
      this.updateSectionDimming('parked-tasks', counts.parked_count)
    }
    
    if (counts.completed_count !== undefined && this.hasCompletedCounterTarget) {
      this.completedCounterTarget.textContent = `${counts.completed_count} completed`
      this.updateSectionDimming('completed-tasks', counts.completed_count)
    }
  }

  updateSectionDimming(sectionClass, count) {
    const section = document.querySelector(`.${sectionClass}`)
    if (section) {
      if (count === 0) {
        section.classList.add('section-dimmed')
      } else {
        section.classList.remove('section-dimmed')
      }
    }
  }
  
  updateSingleCounter(type, count) {
    const counts = {}
    counts[`${type}_count`] = count
    this.updateCounters(counts)
  }
}