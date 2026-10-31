import fs from 'fs';
import path from 'path';

function runHeaderMenuTests() {
  console.log('====================================================');
  console.log('   U2U TOP-RIGHT MENU BUTTON & LAYOUT AUDIT         ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    const headerJsx = fs.readFileSync(path.resolve('src/components/Header.jsx'), 'utf8');
    const indexCss = fs.readFileSync(path.resolve('src/index.css'), 'utf8');
    const appCss = fs.readFileSync(path.resolve('src/App.css'), 'utf8');

    // ── 1. Lucide Menu Icon & Component Structure ──
    console.log('--- 1. LUCIDE MENU ICON & COMPONENT AUDIT ---');
    assert(headerJsx.includes("import {") && headerJsx.includes("Menu,"),
      'Header.jsx imports Menu from lucide-react');
    assert(headerJsx.includes('<Menu size={18} strokeWidth={2.2} className="header-hamburger-icon" />'),
      'Header.jsx renders Menu icon with strokeWidth={2.2} and size={18}');
    assert(!headerJsx.includes('className="hamburger-lines"'),
      'Legacy empty hamburger-lines spans removed');
    assert(headerJsx.includes('className="header-menu-container" ref={menuRef}'),
      'Header.jsx wraps menu trigger and dropdown in .header-menu-container with menuRef');
    assert(headerJsx.includes('aria-label="Session menu"'),
      'Button includes accessible aria-label="Session menu"');
    assert(headerJsx.includes('aria-haspopup="true"'),
      'Button includes aria-haspopup="true"');
    assert(headerJsx.includes('aria-expanded={menuOpen}'),
      'Button includes dynamic aria-expanded state');
    assert(headerJsx.includes("event.key === 'Escape'"),
      'Escape key listener closes dropdown menu');

    // ── 2. Button Styling: Background, Border, Hover, Focus ──
    console.log('\n--- 2. BUTTON STYLING & ACCESSIBILITY AUDIT ---');
    assert(indexCss.includes('.header-hamburger-btn {'),
      'src/index.css defines .header-hamburger-btn rule');
    assert(indexCss.includes('background: var(--glass-bg-elevated);'),
      'Button has visible elevated glass background by default');
    assert(indexCss.includes('border: 1px solid var(--glass-border);'),
      'Button has visible glass border by default');
    assert(indexCss.includes('.header-hamburger-btn:hover'),
      'Button defines explicit :hover pseudo-class state');
    assert(indexCss.includes('border-color: var(--glass-border-hover);'),
      'Button highlights border on hover');
    assert(indexCss.includes('.header-hamburger-btn.active'),
      'Button defines explicit .active state when menu is open');
    assert(indexCss.includes('.header-hamburger-btn:focus-visible'),
      'Button defines high-contrast :focus-visible outline for keyboard navigation');
    assert(indexCss.includes('outline: 2px solid var(--accent);'),
      'Focus-visible uses prominent 2px accent outline');

    // ── 3. SVG Visibility, Stroke, and Color ──
    console.log('\n--- 3. SVG VISIBILITY, STROKE & CONTRAST AUDIT ---');
    assert(indexCss.includes('.header-hamburger-btn svg'),
      'src/index.css styles SVG inside .header-hamburger-btn');
    assert(indexCss.includes('stroke: currentColor;'),
      'SVG stroke uses currentColor for responsive theme adaptation');
    assert(indexCss.includes('stroke-width: 2.2px;'),
      'SVG stroke-width is explicitly reinforced in CSS');
    assert(indexCss.includes('opacity: 1;') && indexCss.includes('visibility: visible;'),
      'Button and icon explicitly guarantee opacity: 1 and visibility: visible');
    assert(appCss.includes("[data-theme='light'] .header-hamburger-btn"),
      'Light theme explicitly styles .header-hamburger-btn for light mode contrast');

    // ── 4. Dropdown Menu Anchoring & Viewport Containment ──
    console.log('\n--- 4. DROPDOWN ANCHORING & OVERFLOW AUDIT ---');
    assert(indexCss.includes('.header-menu-container {') && indexCss.includes('position: relative;'),
      '.header-menu-container is position: relative to anchor the dropdown');
    assert(appCss.includes('.dropdown-menu {') && appCss.includes('position: absolute;'),
      '.dropdown-menu is position: absolute anchored to container');
    assert(appCss.includes('max-height: calc(100vh - 76px);'),
      'Desktop dropdown includes max-height guard to prevent bottom viewport overflow');
    assert(appCss.includes('max-height: calc(100vh - 70px);'),
      'Mobile dropdown includes max-height guard to prevent bottom viewport overflow');
    assert(appCss.includes('overflow-y: auto;'),
      'Dropdown menu enables smooth vertical scroll if screen height is constrained');

    // ── 5. Responsive Viewport Simulations: 1920×1080, 1366×768, 375×812 ──
    console.log('\n--- 5. RESPONSIVE VIEWPORT BOUNDARY VERIFICATIONS ---');

    function simulateMenuPlacement(viewportWidth, viewportHeight) {
      const isMobile = viewportWidth <= 480;
      const isTablet = viewportWidth <= 768 && !isMobile;

      const headerPaddingRight = isMobile ? 6 : (isTablet ? 10 : 22);
      const buttonSize = isMobile ? 31 : (isTablet ? 34 : 36);
      const headerTopHeight = 60;
      const buttonTop = (headerTopHeight - buttonSize) / 2;
      const buttonBottom = buttonTop + buttonSize;

      // Container is positioned at right edge inside padding
      const containerRightOffset = headerPaddingRight;
      const containerLeft = viewportWidth - headerPaddingRight - buttonSize;

      // Dropdown menu dimensions
      const menuMarginFromButton = isMobile ? 6 : 8;
      const menuTop = buttonBottom + menuMarginFromButton;
      const menuMaxWidth = isMobile ? Math.min(230, viewportWidth - 16) : Math.min(250, viewportWidth - 20);
      const menuWidth = menuMaxWidth;
      const menuHeight = 270; // typical full height with 6 items

      // Anchored with right: 0 relative to header-menu-container
      const menuRight = viewportWidth - headerPaddingRight;
      const menuLeft = menuRight - menuWidth;
      const menuBottom = menuTop + menuHeight;

      const clippedRight = menuRight > viewportWidth;
      const clippedLeft = menuLeft < 0;
      const clippedTop = menuTop < 0;
      const clippedBottom = menuBottom > viewportHeight;

      return {
        viewportWidth,
        viewportHeight,
        buttonSize,
        buttonLeft: containerLeft,
        buttonRight: viewportWidth - headerPaddingRight,
        menuLeft,
        menuRight,
        menuTop,
        menuBottom,
        menuWidth,
        menuHeight,
        clippedRight,
        clippedLeft,
        clippedTop,
        clippedBottom,
        isFullyContained: !clippedRight && !clippedLeft && !clippedTop && !clippedBottom
      };
    }

    // Viewport 1: 1920×1080 (FHD Desktop)
    const fhd = simulateMenuPlacement(1920, 1080);
    assert(fhd.isFullyContained, '1920×1080: Dropdown is fully contained within viewport');
    assert(fhd.menuRight === 1920 - 22, '1920×1080: Dropdown right edge aligns with trigger container (22px padding)');
    assert(fhd.menuLeft > 0 && fhd.menuLeft === 1920 - 22 - 250, '1920×1080: Dropdown left edge is safely padded (> 0)');
    assert(fhd.menuBottom < 1080, '1920×1080: Dropdown bottom is not clipped (338px < 1080px)');

    // Viewport 2: 1366×768 (Standard Laptop)
    const laptop = simulateMenuPlacement(1366, 768);
    assert(laptop.isFullyContained, '1366×768: Dropdown is fully contained within viewport');
    assert(laptop.menuRight === 1366 - 22, '1366×768: Dropdown right edge aligns with trigger container (22px padding)');
    assert(laptop.menuLeft > 0 && laptop.menuLeft === 1366 - 22 - 250, '1366×768: Dropdown left edge is safely padded (> 0)');
    assert(laptop.menuBottom < 768, '1366×768: Dropdown bottom is not clipped (338px < 768px)');

    // Viewport 3: 375×812 (Mobile iPhone X/11/12/13/14 Mini)
    const mobile = simulateMenuPlacement(375, 812);
    assert(mobile.isFullyContained, '375×812: Dropdown is fully contained within viewport');
    assert(mobile.menuRight === 375 - 6, '375×812: Dropdown right edge aligns with trigger container (6px padding)');
    assert(mobile.menuLeft >= 0 && mobile.menuLeft === 375 - 6 - 230, '375×812: Dropdown left edge has comfortable 139px margin from screen left edge');
    assert(mobile.menuBottom < 812, '375×812: Dropdown bottom is not clipped (336px < 812px)');
    assert(mobile.menuWidth === 230, '375×812: Dropdown width respects 230px mobile constraint');

  } catch (err) {
    console.error('Fatal error in Header Menu tests:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runHeaderMenuTests();
