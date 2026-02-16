
// SIMPLE STRUGGLE DETECTOR - Working version
class StruggleDetector {
  constructor() {
    this.clickHistory = [];
    this.scrollHistory = [];
    this.lastTriggerTime = 0;
    this.cooldown = 3000; // 3 seconds between triggers
    console.log("[Struggle] Initializing detector");
    
    // Simple click detection
    document.addEventListener('click', (e) => this.onClickEvent(e), true);
    
    // Scroll detection - use window, not document
    window.addEventListener('scroll', () => this.onScrollEvent(), true);
  }

  onClickEvent(event) {
    const now = Date.now();
    this.clickHistory.push({x: event.clientX, y: event.clientY, t: now});
    
    // Keep only last 2 seconds
    this.clickHistory = this.clickHistory.filter(c => now - c.t < 2000);
    
    // 3+ clicks in same spot = rage click
    if (this.clickHistory.length >= 3) {
      const clicks = this.clickHistory;
      const first = clicks[0];
      
      // Check if all within 50px
      const inRadius = clicks.every(c => {
        const dist = Math.hypot(c.x - first.x, c.y - first.y);
        return dist < 80;
      });
      
      if (inRadius && now - this.lastTriggerTime > this.cooldown) {
        this.lastTriggerTime = now;
        this.trigger('rage_click');
      }
    }
  }

  onScrollEvent() {
    const now = Date.now();
    const currentScrollY = window.scrollY || window.pageYOffset;
    
    // Only add to history if position actually changed
    if (this.scrollHistory.length === 0 || currentScrollY !== this.scrollHistory[this.scrollHistory.length - 1].y) {
      this.scrollHistory.push({y: currentScrollY, t: now});
      console.log("[Struggle] Scroll recorded:", currentScrollY, "history length:", this.scrollHistory.length);
      
      // Keep only last 2 seconds
      this.scrollHistory = this.scrollHistory.filter(s => now - s.t < 2000);
      
      // Need at least 5 scroll positions to detect pattern
      if (this.scrollHistory.length >= 5) {
        // Calculate directions between consecutive positions
        const directions = [];
        for (let i = 1; i < this.scrollHistory.length; i++) {
          const delta = this.scrollHistory[i].y - this.scrollHistory[i-1].y;
          // Record direction if movement > 3px
          if (Math.abs(delta) > 3) {
            directions.push(delta > 0 ? 'D' : 'U');
          }
        }
        
        console.log("[Struggle] Scroll directions:", directions.join(''));
        
        // Count transitions (U to D or D to U)
        let transitions = 0;
        for (let i = 1; i < directions.length; i++) {
          if (directions[i] !== directions[i-1]) {
            transitions++;
          }
        }
        
        console.log("[Struggle] Scroll transitions:", transitions);
        
        // Trigger if user is rapidly scrolling back and forth (2+ transitions = down-up-down or up-down-up)
        if (transitions >= 2 && now - this.lastTriggerTime > this.cooldown) {
          console.log("[Struggle] *** ERRATIC SCROLL DETECTED ***");
          this.lastTriggerTime = now;
          this.trigger('erratic_scroll');
        }
      }
    }
  }

  trigger(type) {
    console.log("[Struggle] TRIGGERED:", type);
    window.dispatchEvent(new CustomEvent('STRUGGLE_DETECTED', {detail: {trigger: type}}));
  }
}

// Auto-init
window.struggleDetector = new StruggleDetector();
