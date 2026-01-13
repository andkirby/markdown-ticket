import mermaid from 'mermaid';

let initialized = false;

function initMermaid() {
  if (!initialized) {
    const isDark = document.documentElement.classList.contains('dark');
    
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'default',
      themeVariables: {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '14px',
        background: 'transparent',
        primaryColor: isDark ? '#1f2937' : '#f9fafb',
        primaryTextColor: isDark ? '#f9fafb' : '#1f2937'
      }
    });
    initialized = true;
  }
}

export function processMermaidBlocks(html: string): string {
  let counter = 0;
  return html
    .replace(
      /<pre><code class="mermaid language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
      (match, content) => {
        const decoded = content.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
        const id = `mermaid-diagram-${++counter}`;
        return `<div class="mermaid-container" data-mermaid-id="${id}"><code class="mermaid" id="${id}">${decoded}</code></div>`;
      }
    )
    .replace(
      /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
      (match, content) => {
        const decoded = content.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
        const id = `mermaid-diagram-${++counter}`;
        return `<div class="mermaid-container" data-mermaid-id="${id}"><code class="mermaid" id="${id}">${decoded}</code></div>`;
      }
    );
}

export async function renderMermaid() {
  // Re-initialize to pick up theme changes
  initialized = false;
  initMermaid();
  await mermaid.run();
  addFullscreenButtons();
}

function addFullscreenButtons() {
  const mermaidContainers = document.querySelectorAll('.mermaid-container');

  mermaidContainers.forEach((container) => {
    // Check if fullscreen button already exists
    if (container.querySelector('.mermaid-fullscreen-btn')) return;

    const button = document.createElement('button');
    button.className = 'mermaid-fullscreen-btn absolute top-2 left-2 z-10 px-2 py-1 bg-black/20 hover:bg-black/30 text-white text-xs rounded transition-colors duration-200 backdrop-blur-sm';
    button.title = 'Enter fullscreen';
    button.type = 'button';

    // Add fullscreen icon
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
      </svg>
    `;

    button.addEventListener('click', () => toggleMermaidFullscreen(container as HTMLElement));

    // Make container relative positioned for button positioning
    (container as HTMLElement).style.position = 'relative';
    container.appendChild(button);

    // Add zoom functionality data attribute
    container.setAttribute('data-zoom-enabled', 'false');
  });
}

async function toggleMermaidFullscreen(container: HTMLElement) {
  const isCurrentlyFullscreen = document.fullscreenElement === container;

  try {
    if (isCurrentlyFullscreen) {
      await exitFullscreen();
      disableZoom(container);
    } else {
      await enterFullscreen(container);
      // Small delay to allow fullscreen transition to complete
      setTimeout(() => {
        enableZoom(container);
      }, 100);
    }
  } catch (err) {
    console.error('Error toggling fullscreen:', err);
  }
}

async function enterFullscreen(element: HTMLElement) {
  if (element.requestFullscreen) {
    await element.requestFullscreen();
  } else if ((element as any).webkitRequestFullscreen) {
    await (element as any).webkitRequestFullscreen();
  } else if ((element as any).msRequestFullscreen) {
    await (element as any).msRequestFullscreen();
  }
}

async function exitFullscreen() {
  if (document.exitFullscreen) {
    await document.exitFullscreen();
  } else if ((document as any).webkitExitFullscreen) {
    await (document as any).webkitExitFullscreen();
  } else if ((document as any).msExitFullscreen) {
    await (document as any).msExitFullscreen();
  }
}

// Listen for fullscreen changes to update button icon
document.addEventListener('fullscreenchange', updateFullscreenButtons);
document.addEventListener('webkitfullscreenchange', updateFullscreenButtons);
document.addEventListener('msfullscreenchange', updateFullscreenButtons);

function updateFullscreenButtons() {
  const mermaidContainers = document.querySelectorAll('.mermaid-container');
  const fullscreenElement = document.fullscreenElement ||
                           (document as any).webkitFullscreenElement ||
                           (document as any).msFullscreenElement;

  mermaidContainers.forEach((container) => {
    const button = container.querySelector('.mermaid-fullscreen-btn') as HTMLButtonElement;
    if (!button) return;

    const isFullscreen = fullscreenElement === container;

    button.title = isFullscreen ? 'Exit fullscreen (Scroll to zoom)' : 'Enter fullscreen';
    button.innerHTML = isFullscreen ?
      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
         <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 0 2-2h3M3 16h3a2 2 0 0 0 2 2v3" />
       </svg>` :
      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
         <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
       </svg>`;

    // Style the container when in fullscreen
    if (isFullscreen) {
      const isDarkMode = document.documentElement.classList.contains('dark');
      (container as HTMLElement).style.backgroundColor = isDarkMode ? '#111827' : 'white';
      (container as HTMLElement).style.padding = '2rem';
      (container as HTMLElement).style.display = 'flex';
      (container as HTMLElement).style.alignItems = 'center';
      (container as HTMLElement).style.justifyContent = 'center';
      (container as HTMLElement).style.minHeight = '100vh';
      (container as HTMLElement).style.boxSizing = 'border-box';
      (container as HTMLElement).style.overflow = 'hidden';

      // Ensure mermaid SVG has transparent background and adaptive scale
      const diagram = container.querySelector('.mermaid') as HTMLElement;
      if (diagram) {
        const svg = diagram.querySelector('svg');
        if (svg) {
          svg.style.backgroundColor = 'transparent';
        }

        // Calculate adaptive scale based on container context
        const parentContainer = diagram.closest('.prose');
        const isInModal = !!diagram.closest('[role="dialog"]') || !!diagram.closest('.modal');

        // Calculate adaptive scale by comparing rendered sizes
        let adaptiveScale = 2.3; // Fallback default

        // Get current rendered dimensions
        const containerRect = container.getBoundingClientRect();
        const diagramRect = diagram.getBoundingClientRect();

        if (containerRect.width > 0 && containerRect.height > 0 && diagramRect.width > 0 && diagramRect.height > 0) {
          // Get available screen space (90% of viewport)
          const maxWidth = window.innerWidth * 0.9;
          const maxHeight = window.innerHeight * 0.9;

          // Calculate what scale would make the current diagram fit the target size
          const scaleX = maxWidth / diagramRect.width;
          const scaleY = maxHeight / diagramRect.height;

          // Use the smaller scale to ensure it fits in both dimensions
          const calculatedScale = Math.min(scaleX, scaleY);

          // Apply reasonable bounds to the calculated scale
          adaptiveScale = Math.max(0.5, Math.min(8, calculatedScale));
        } else {
          // Fallback to context-based scaling if no dimensions available
          if (parentContainer && !isInModal) {
            adaptiveScale = 3.0; // Documents view
          }
        }

        // Set adaptive scale for fullscreen
        diagram.style.transform = `scale(${adaptiveScale})`;
        diagram.style.transformOrigin = 'center center';

        // Store the scale for zoom functionality
        diagram.dataset.fullscreenScale = adaptiveScale.toString();
      }

      enableZoom(container as HTMLElement);
    } else {
      (container as HTMLElement).style.backgroundColor = '';
      (container as HTMLElement).style.padding = '';
      (container as HTMLElement).style.display = '';
      (container as HTMLElement).style.alignItems = '';
      (container as HTMLElement).style.justifyContent = '';
      (container as HTMLElement).style.minHeight = '';
      (container as HTMLElement).style.boxSizing = '';
      (container as HTMLElement).style.overflow = '';

      // Reset diagram transform
      const diagram = container.querySelector('.mermaid') as HTMLElement;
      if (diagram) {
        diagram.style.transform = '';
        diagram.style.transformOrigin = '';
        delete diagram.dataset.fullscreenScale;
      }

      disableZoom(container as HTMLElement);
    }
  });
}

function enableZoom(container: HTMLElement) {
  if (container.getAttribute('data-zoom-enabled') === 'true') return;

  const diagram = container.querySelector('.mermaid') as HTMLElement;
  if (!diagram) return;

  // Get the adaptive scale that was set during fullscreen entry
  const adaptiveScale = parseFloat(diagram.dataset.fullscreenScale || '2.3');
  let scale = adaptiveScale;
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let translate = { x: 0, y: 0 };

  // Initial transform (use the existing transform from fullscreen setup)
  diagram.style.transformOrigin = 'center center';
  diagram.style.transition = 'transform 0.1s ease-out';
  diagram.style.cursor = 'grab';

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();

    // Get adaptive max zoom based on current rendered dimensions
    const diagramRect = diagram.getBoundingClientRect();
    let maxZoom = 10; // Default higher limit

    if (diagramRect.width > 800 || diagramRect.height > 600) {
      maxZoom = 15; // Very wide/tall diagrams get higher zoom
    }
    if (diagramRect.width > 1200 || diagramRect.height > 800) {
      maxZoom = 20; // Extremely wide diagrams get even higher zoom
    }

    // Use percentage-based scaling (10% of current scale)
    const scaleStep = scale * 0.1; // 10% of current scale
    const pinchScaleStep = scale * 0.15; // 15% of current scale for pinch

    // Handle pinch-to-zoom on trackpads (ctrlKey is set during pinch gestures)
    if (e.ctrlKey) {
      const delta = e.deltaY > 0 ? -pinchScaleStep : pinchScaleStep;
      const newScale = Math.max(0.1, Math.min(maxZoom, scale + delta));

      if (newScale !== scale) {
        scale = newScale;
        diagram.style.transform = `scale(${scale}) translate(${translate.x}px, ${translate.y}px)`;
      }
    } else {
      // Regular scroll wheel zoom - 10% of current scale
      const delta = e.deltaY > 0 ? -scaleStep : scaleStep;
      const newScale = Math.max(0.1, Math.min(maxZoom, scale + delta));

      if (newScale !== scale) {
        scale = newScale;
        diagram.style.transform = `scale(${scale}) translate(${translate.x}px, ${translate.y}px)`;
      }
    }
  };

  const handleMouseDown = (e: MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      isDragging = true;
      diagram.style.cursor = 'grabbing';
      diagram.style.transition = '';
      dragStart = { x: e.clientX - translate.x * scale, y: e.clientY - translate.y * scale };
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      // Apply inverse scaling to mouse movement for 1:1 movement ratio
      const scaledDeltaX = (e.clientX - dragStart.x) / scale;
      const scaledDeltaY = (e.clientY - dragStart.y) / scale;
      translate.x = scaledDeltaX;
      translate.y = scaledDeltaY;
      diagram.style.transform = `scale(${scale}) translate(${translate.x}px, ${translate.y}px)`;
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      isDragging = false;
      diagram.style.cursor = 'grab';
      diagram.style.transition = 'transform 0.1s ease-out';
    }
  };

  // Touch support for mobile
  let lastTouchDistance = 0;
  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      lastTouchDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
    } else if (e.touches.length === 1) {
      isDragging = true;
      const touch = e.touches[0];
      dragStart = { x: touch.clientX - translate.x * scale, y: touch.clientY - translate.y * scale };
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();

    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );

      if (lastTouchDistance > 0) {
        // Get adaptive zoom limits for touch as well using rendered dimensions
        const diagramRect = diagram.getBoundingClientRect();
        let maxZoom = 10;

        if (diagramRect.width > 800 || diagramRect.height > 600) {
          maxZoom = 15;
        }
        if (diagramRect.width > 1200 || diagramRect.height > 800) {
          maxZoom = 20;
        }

        // Use percentage-based scaling for touch as well (10% of current scale)
        const touchScaleStep = scale * 0.1;
        const delta = (distance - lastTouchDistance) > 0 ? touchScaleStep : -touchScaleStep;
        const newScale = Math.max(0.1, Math.min(maxZoom, scale + delta));

        if (newScale !== scale) {
          scale = newScale;
          diagram.style.transform = `scale(${scale}) translate(${translate.x}px, ${translate.y}px)`;
        }
      }

      lastTouchDistance = distance;
    } else if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      const scaledDeltaX = (touch.clientX - dragStart.x) / scale;
      const scaledDeltaY = (touch.clientY - dragStart.y) / scale;
      translate.x = scaledDeltaX;
      translate.y = scaledDeltaY;
      diagram.style.transform = `scale(${scale}) translate(${translate.x}px, ${translate.y}px)`;
    }
  };

  const handleTouchEnd = () => {
    isDragging = false;
    lastTouchDistance = 0;
  };

  // Reset zoom with double-click
  const handleDoubleClick = () => {
    scale = adaptiveScale; // Reset to the adaptive fullscreen scale
    translate = { x: 0, y: 0 };
    diagram.style.transition = 'transform 0.3s ease-out';
    diagram.style.transform = `scale(${scale}) translate(${translate.x}px, ${translate.y}px)`;
    setTimeout(() => {
      diagram.style.transition = 'transform 0.1s ease-out';
    }, 300);
  };

  // Add event listeners
  container.addEventListener('wheel', handleWheel, { passive: false });
  diagram.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  diagram.addEventListener('touchstart', handleTouchStart, { passive: false });
  diagram.addEventListener('touchmove', handleTouchMove, { passive: false });
  diagram.addEventListener('touchend', handleTouchEnd);
  diagram.addEventListener('dblclick', handleDoubleClick);

  // Store event handlers for cleanup
  container.setAttribute('data-zoom-enabled', 'true');
  (container as any)._zoomHandlers = {
    wheel: handleWheel,
    mouseDown: handleMouseDown,
    mouseMove: handleMouseMove,
    mouseUp: handleMouseUp,
    touchStart: handleTouchStart,
    touchMove: handleTouchMove,
    touchEnd: handleTouchEnd,
    doubleClick: handleDoubleClick
  };
}

function disableZoom(container: HTMLElement) {
  if (container.getAttribute('data-zoom-enabled') === 'false') return;

  const diagram = container.querySelector('.mermaid') as HTMLElement;
  if (!diagram) return;

  // Reset transform
  diagram.style.transform = '';
  diagram.style.transformOrigin = '';
  diagram.style.transition = '';
  diagram.style.cursor = '';

  // Remove event listeners
  const handlers = (container as any)._zoomHandlers;
  if (handlers) {
    container.removeEventListener('wheel', handlers.wheel);
    diagram.removeEventListener('mousedown', handlers.mouseDown);
    document.removeEventListener('mousemove', handlers.mouseMove);
    document.removeEventListener('mouseup', handlers.mouseUp);
    diagram.removeEventListener('touchstart', handlers.touchStart);
    diagram.removeEventListener('touchmove', handlers.touchMove);
    diagram.removeEventListener('touchend', handlers.touchEnd);
    diagram.removeEventListener('dblclick', handlers.doubleClick);
  }

  container.setAttribute('data-zoom-enabled', 'false');
  delete (container as any)._zoomHandlers;
}

// Debug function to analyze mermaid diagram sizing (for development use)
function debugMermaidSizing() {
  const containers = document.querySelectorAll('.mermaid-container');

  if (containers.length === 0) {
    console.log('❌ No mermaid containers found');
    return;
  }

  console.log('📊 MERMAID SIZING DEBUG REPORT');
  console.log('='.repeat(50));

  containers.forEach((container, index) => {
    const diagram = container.querySelector('.mermaid') as HTMLElement;
    const svg = diagram?.querySelector('svg');

    if (!diagram || !svg) {
      console.log(`❌ Container ${index + 1}: No diagram/SVG found`);
      return;
    }

    console.log(`\n🔍 DIAGRAM ${index + 1}:`);

    // Screen information
    console.log(`📺 Screen: ${window.innerWidth}x${window.innerHeight}`);
    console.log(`📺 Available (90%): ${(window.innerWidth * 0.9).toFixed(0)}x${(window.innerHeight * 0.9).toFixed(0)}`);
    console.log(`📺 Available (80%): ${(window.innerWidth * 0.8).toFixed(0)}x${(window.innerHeight * 0.8).toFixed(0)}`);

    // SVG dimensions
    const viewBox = svg.getAttribute('viewBox');
    const widthAttr = svg.getAttribute('width');
    const heightAttr = svg.getAttribute('height');

    let contentWidth = 0;
    let contentHeight = 0;

    if (viewBox) {
      const [x, y, width, height] = viewBox.split(' ').map(Number);
      contentWidth = width;
      contentHeight = height;
      console.log(`📐 SVG Content (viewBox): ${contentWidth.toFixed(0)}x${contentHeight.toFixed(0)}`);
    } else {
      contentWidth = widthAttr ? parseFloat(widthAttr) : 0;
      contentHeight = heightAttr ? parseFloat(heightAttr) : 0;
      console.log(`📐 SVG Content (attributes): ${contentWidth.toFixed(0)}x${contentHeight.toFixed(0)}`);
    }

    // Rendered dimensions
    const rect = svg.getBoundingClientRect();
    console.log(`📐 SVG Rendered: ${rect.width.toFixed(0)}x${rect.height.toFixed(0)}`);

    // Current transform
    const currentTransform = diagram.style.transform || 'none';
    console.log(`🎭 Current Transform: ${currentTransform}`);

    // Stored scale
    const storedScale = diagram.dataset.fullscreenScale;
    console.log(`💾 Stored Scale: ${storedScale || 'none'}`);

    // Calculate what scales would be needed
    const scale90X = (window.innerWidth * 0.9) / contentWidth;
    const scale90Y = (window.innerHeight * 0.9) / contentHeight;
    const scale90 = Math.min(scale90X, scale90Y);

    const scale80X = (window.innerWidth * 0.8) / contentWidth;
    const scale80Y = (window.innerHeight * 0.8) / contentHeight;
    const scale80 = Math.min(scale80X, scale80Y);

    console.log(`🧮 Calculated Scales:`);
    console.log(`   90% fit: ${scale90.toFixed(3)} (${(contentWidth * scale90).toFixed(0)}x${(contentHeight * scale90).toFixed(0)})`);
    console.log(`   80% fit: ${scale80.toFixed(3)} (${(contentWidth * scale80).toFixed(0)}x${(contentHeight * scale80).toFixed(0)})`);

    // Context detection
    const parentContainer = diagram.closest('.prose');
    const isInModal = !!diagram.closest('[role="dialog"]') || !!diagram.closest('.modal');
    console.log(`🏠 Context: ${isInModal ? 'Modal/Ticket View' : 'Documents View'}`);

    console.log('-'.repeat(30));
  });

  console.log('\n✅ Debug report complete. Call debugMermaidSizing() again after changes.');
}
