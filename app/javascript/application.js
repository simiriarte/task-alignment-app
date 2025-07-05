// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
import "@hotwired/turbo-rails"
import "controllers"

// Accordion Functionality - More robust implementation
function initializeAccordion() {
  console.log('Initializing accordion...');
  
  // Wait a bit for DOM to be ready
  setTimeout(() => {
    const accordionTriggers = document.querySelectorAll('[data-accordion-trigger]');
    console.log('Found accordion triggers:', accordionTriggers.length);
    
    if (accordionTriggers.length === 0) {
      console.log('No accordion triggers found');
      return;
    }
    
    accordionTriggers.forEach((trigger, index) => {
      console.log(`Adding event listener to trigger ${index}`);
      
      trigger.addEventListener('click', function(e) {
        console.log('Accordion trigger clicked!');
        e.preventDefault();
        
        const accordionItem = this.closest('.accordion-item');
        const isExpanded = accordionItem.classList.contains('expanded');
        
        console.log('Current item expanded:', isExpanded);
        
        // Close all accordion items
        document.querySelectorAll('.accordion-item').forEach(item => {
          item.classList.remove('expanded');
        });
        
        // Open clicked item if it wasn't already open
        if (!isExpanded) {
          accordionItem.classList.add('expanded');
          console.log('Expanding item');
        } else {
          console.log('Collapsing item');
        }
      });
    });
  }, 100);
}

// Wins Sidebar Functionality
function initializeWinsSidebar() {
  const winsSidebar = document.getElementById('winsSidebar');
  const winsToggle = document.getElementById('winsToggle');
  const winsClose = document.getElementById('winsClose');
  const winsInput = document.getElementById('winsInput');
  const winsAddBtn = document.getElementById('winsAddBtn');
  const winsList = document.getElementById('winsList');
  const mainContent = document.querySelector('.main-content');
  
  if (!winsSidebar || !winsToggle || !winsClose || !winsInput || !winsAddBtn || !winsList || !mainContent) {
    return; // Exit if elements not found (not on tasks page)
  }
  
  // Load wins from localStorage
  function loadWins() {
    const wins = JSON.parse(localStorage.getItem('userWins') || '[]');
    renderWins(wins);
  }
  
  // Save wins to localStorage
  function saveWins(wins) {
    localStorage.setItem('userWins', JSON.stringify(wins));
  }
  
  // Render wins list
  function renderWins(wins) {
    winsList.innerHTML = '';
    wins.forEach((win, index) => {
      const winItem = document.createElement('div');
      winItem.className = 'wins-item';
             winItem.innerHTML = `
         <div class="wins-icon">
           <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
             <!-- Main trophy cup - wide bowl -->
             <path d="M7 3h10v6c0 2.8-2.2 5-5 5s-5-2.2-5-5V3z"/>
             <!-- Left handle -->
             <path d="M5 6h2v4c0 .5-.5 1-1 1s-1-.5-1-1V6z"/>
             <!-- Right handle -->
             <path d="M17 6h2v4c0 .5-.5 1-1 1s-1-.5-1-1V6z"/>
             <!-- Narrow stem -->
             <rect x="10.5" y="14" width="3" height="3" rx="1"/>
             <!-- Wide base -->
             <rect x="8" y="17" width="8" height="2" rx="1"/>
           </svg>
         </div>
         <span class="wins-text">${win}</span>
         <button class="wins-delete" data-index="${index}">
           <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
             <path d="M6 18L18 6M6 6l12 12"/>
           </svg>
         </button>
       `;
      winsList.appendChild(winItem);
    });
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.wins-delete').forEach(btn => {
      btn.addEventListener('click', function() {
        const index = parseInt(this.dataset.index);
        deleteWin(index);
      });
    });
  }
  
  // Add new win
  function addWin() {
    const winText = winsInput.value.trim();
    if (winText) {
      const wins = JSON.parse(localStorage.getItem('userWins') || '[]');
      wins.unshift(winText); // Add to beginning of array
      saveWins(wins);
      renderWins(wins);
      winsInput.value = '';
    }
  }
  
  // Delete win
  function deleteWin(index) {
    const wins = JSON.parse(localStorage.getItem('userWins') || '[]');
    wins.splice(index, 1);
    saveWins(wins);
    renderWins(wins);
  }
  
  // Toggle sidebar
  function toggleSidebar() {
    winsSidebar.classList.toggle('open');
    mainContent.classList.toggle('wins-open');
  }
  
  // Event listeners
  winsToggle.addEventListener('click', toggleSidebar);
  winsClose.addEventListener('click', toggleSidebar);
  winsAddBtn.addEventListener('click', addWin);
  
  // Enter key support for input
  winsInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      addWin();
    }
  });
  
  // Load wins on page load
  loadWins();
}

// Initialize all functionality on DOMContentLoaded and Turbo navigation
document.addEventListener('DOMContentLoaded', function() {
  initializeAccordion();
  initializeWinsSidebar();
});

document.addEventListener('turbo:load', function() {
  initializeAccordion();
  initializeWinsSidebar();
});
