// -------- CONFIGURATION --------
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbx20ZnNP98AaZageJqz_oOCNtBjXZg7OzouKtQNKAQeP-hk0k-hmTLC758hY2cCNyor/exec";
let ADMIN_PASS = localStorage.getItem('brilho_admin_pass') || "1234";
const BUSINESS_PHONE = "584149262763"; // format without + or dashes for wa.me
const ADMIN_WHATSAPP = "584149262763"; // Tu WhatsApp de administrador (sin + ni espacios)

// -------- STATE --------
let products = [];
let cart = JSON.parse(localStorage.getItem('brilho_cart') || '[]'); // ✅ Carrito persistente
let currentDept = 'all';
let currentCat = 'all';
let currentSearch = '';
let isFirstLoad = true;

// -------- COLORES, MEDIDAS Y VENDEDORES --------
const DEFAULT_COLORS = [
    { name: 'Dorado', hex: '#d4af37' },
    { name: 'Plateado', hex: '#c0c0c0' },
    { name: 'Oro Rosa', hex: '#e8a87c' },
    { name: 'Negro', hex: '#1a1a1a' },
    { name: 'Blanco', hex: '#f5f5f5' }
];
const DEFAULT_SIZES = ['5', '6', '7', '8', '9', '10', '11', '12', '13'];
const DEFAULT_SELLERS = ['Vendedor 1'];

let availableColors = JSON.parse(localStorage.getItem('brilho_colors') || 'null') || [...DEFAULT_COLORS];
let availableSizes = JSON.parse(localStorage.getItem('brilho_sizes') || 'null') || [...DEFAULT_SIZES];
let availableSellers = JSON.parse(localStorage.getItem('brilho_sellers') || 'null') || [...DEFAULT_SELLERS];

// Variant modal state
let _vmPendingProduct = null;
let _vmSelectedColor = null;
let _vmSelectedSize = null;

// -------- DOM ELEMENTS --------
const els = {
    // Navigation
    navbar: document.getElementById('navbar'),
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    mobileDrawer: document.getElementById('mobileDrawer'),
    closeMobileDrawer: document.getElementById('closeMobileDrawer'),
    mobileOverlay: document.getElementById('mobileOverlay'),
    mobileCategories: document.getElementById('mobileCategories'),
    categoryRibbon: document.getElementById('categoryRibbon'),
    
    // Grids
    productGrid: document.getElementById('productGrid'),
    adminProductGrid: document.getElementById('adminProductGrid'),
    
    // Cart
    cartBtn: document.getElementById('cartBtn'),
    cartSidebar: document.getElementById('cartSidebar'),
    closeCartBtn: document.getElementById('closeCartBtn'),
    cartOverlay: document.getElementById('cartOverlay'),
    cartItems: document.getElementById('cartItems'),
    cartCount: document.getElementById('cartCount'),
    cartTotal: document.getElementById('cartTotal'),
    
    // Checkout
    checkoutBtn: document.getElementById('checkoutBtn'),
    checkoutModal: document.getElementById('checkoutModal'),
    modalOverlayCheckout: document.getElementById('modalOverlayCheckout'),
    cancelCheckout: document.getElementById('cancelCheckout'),
    checkoutForm: document.getElementById('checkoutForm'),
    
    // Admin Login
    adminLoginBtn: document.getElementById('adminLoginBtn'),
    loginModal: document.getElementById('loginModal'),
    modalOverlayLogin: document.getElementById('modalOverlayLogin'),
    cancelLogin: document.getElementById('cancelLogin'),
    confirmLogin: document.getElementById('confirmLogin'),
    adminPassInput: document.getElementById('adminPassInput'),
    
    // Admin Panel
    adminPanel: document.getElementById('adminPanel'),
    modalOverlayAdmin: document.getElementById('modalOverlayAdmin'),
    closeAdminBtn: document.getElementById('closeAdminBtn'),
    productForm: document.getElementById('productForm'),
    adminStatus: document.getElementById('adminStatus'),
    saveProductBtn: document.getElementById('saveProductBtn'),
    
    // Search
    searchInput: document.getElementById('searchInput'),
};

// -------- INITIALIZATION --------
function initApp() {
    initEvents();
    initManagement();
    loadProducts();
    // Auto-refresh products every 45s
    setInterval(loadProducts, 45000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// -------- EVENT LISTENERS --------
function initEvents() {
    // Scroll behavior for Navbar
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) els.navbar.style.background = 'rgba(10, 10, 10, 0.95)';
        else els.navbar.style.background = 'rgba(20, 20, 20, 0.85)';
    });

    // Mobile Drawer
    els.mobileMenuBtn.addEventListener('click', () => toggleMobileDrawer(true));
    els.closeMobileDrawer.addEventListener('click', () => toggleMobileDrawer(false));
    els.mobileOverlay.addEventListener('click', () => toggleMobileDrawer(false));

    // Cart Sidebar
    els.cartBtn.addEventListener('click', () => toggleCart(true));
    els.closeCartBtn.addEventListener('click', () => toggleCart(false));
    els.cartOverlay.addEventListener('click', () => toggleCart(false));

    // Download Ticket Button (inside checkout form)
    document.getElementById('downloadTicketBtn').addEventListener('click', () => {
        // Validate form fields before generating ticket
        const form = document.getElementById('checkoutForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        const sellerEl = document.getElementById('custSeller');
        const clientData = {
            name: document.getElementById('custName').value.trim(),
            idNum: document.getElementById('custId').value.trim(),
            phone: document.getElementById('custPhone').value.trim(),
            transport: document.getElementById('custTransport').value.trim(),
            addr: document.getElementById('custAddr').value.trim(),
            seller: sellerEl ? sellerEl.value.trim() : ''
        };
        generateTicketPDF(clientData, 'download');
    });

    // Email Ticket Button
    const emailTicketBtn = document.getElementById('emailTicketBtn');
    if (emailTicketBtn) {
        emailTicketBtn.addEventListener('click', () => {
            const form = document.getElementById('checkoutForm');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            
            const email = document.getElementById('custEmail').value.trim();
            if (!email) {
                alert('Por favor ingrese su correo electrónico para enviar el ticket.');
                document.getElementById('custEmail').focus();
                return;
            }

            const sellerEl2 = document.getElementById('custSeller');
            const clientData = {
                name: document.getElementById('custName').value.trim(),
                idNum: document.getElementById('custId').value.trim(),
                phone: document.getElementById('custPhone').value.trim(),
                transport: document.getElementById('custTransport').value.trim(),
                addr: document.getElementById('custAddr').value.trim(),
                seller: sellerEl2 ? sellerEl2.value.trim() : ''
            };

            generateTicketPDF(clientData, 'email', email);
        });
    }

    // Search Bar event
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const searchInputEl = document.getElementById('searchInput');
            currentSearch = searchInputEl ? searchInputEl.value : '';
            applyFilters();
        });
    }
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            if (e.target.value.trim() === '') {
                currentSearch = '';
                applyFilters();
            }
        });
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                currentSearch = e.target.value;
                applyFilters();
            }
        });
    }
    
    if (document.getElementById('searchFilter')) {
        document.getElementById('searchFilter').addEventListener('change', (e) => {
            filterBy(e.target.value, 'all');
        });
    }

    // Checkout Modal
    els.checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) return alert('El carrito está vacío');
        toggleCart(false);
        toggleModal(els.checkoutModal, els.modalOverlayCheckout, true);
    });
    els.cancelCheckout.addEventListener('click', () => toggleModal(els.checkoutModal, els.modalOverlayCheckout, false));
    els.modalOverlayCheckout.addEventListener('click', () => toggleModal(els.checkoutModal, els.modalOverlayCheckout, false));
    els.checkoutForm.addEventListener('submit', handleOrderSubmit);

    // Admin Login Modal
    els.adminLoginBtn.addEventListener('click', () => toggleModal(els.loginModal, els.modalOverlayLogin, true));
    els.cancelLogin.addEventListener('click', () => toggleModal(els.loginModal, els.modalOverlayLogin, false));
    els.modalOverlayLogin.addEventListener('click', () => toggleModal(els.loginModal, els.modalOverlayLogin, false));
    els.confirmLogin.addEventListener('click', handleLogin);
    els.adminPassInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });

    const recoverPassBtn = document.getElementById('recoverPassBtn');
    if (recoverPassBtn) {
        recoverPassBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const email = prompt("Por favor, ingresa tu correo electrónico para recibir la contraseña:");
            if (email && email.trim() !== "") {
                const body = `Hola,\n\nTu contraseña de administrador para el Catálogo Premium es: ${ADMIN_PASS}\n\nGuarda este correo en un lugar seguro.`;
                window.location.href = `mailto:${email.trim()}?subject=${encodeURIComponent('Recuperación de Contraseña - Admin')}&body=${encodeURIComponent(body)}`;
                toggleModal(els.loginModal, els.modalOverlayLogin, false);
            }
        });
    }

    // Admin Panel
    els.closeAdminBtn.addEventListener('click', () => toggleModal(els.adminPanel, els.modalOverlayAdmin, false));
    els.modalOverlayAdmin.addEventListener('click', () => toggleModal(els.adminPanel, els.modalOverlayAdmin, false));

    const changePassBtn = document.getElementById('changePassBtn');
    if (changePassBtn) {
        changePassBtn.addEventListener('click', () => {
            const current = prompt("Ingresa tu contraseña actual:");
            if (current !== null) {
                if (current === ADMIN_PASS) {
                    const newPass = prompt("Ingresa la nueva contraseña:");
                    if (newPass && newPass.trim() !== "") {
                        ADMIN_PASS = newPass.trim();
                        localStorage.setItem('brilho_admin_pass', ADMIN_PASS);
                        alert("Contraseña actualizada con éxito.");
                    } else {
                        alert("La contraseña no puede estar vacía.");
                    }
                } else {
                    alert("Contraseña actual incorrecta.");
                }
            }
        });
    }
    els.productForm.addEventListener('submit', handleAddProduct);

    // Global click for closing dropdowns
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.cat-dropdown')) {
            document.querySelectorAll('.cat-dropdown').forEach(el => el.classList.remove('open'));
        }
    });

    // Admin Search
    const adminSearchInput = document.getElementById('adminSearchInput');
    if (adminSearchInput) {
        adminSearchInput.addEventListener('input', () => {
            renderAdminList();
        });
    }

    // Variant Modal Events
    const vmCancelBtn = document.getElementById('vmCancelBtn');
    const vmAddBtn = document.getElementById('vmAddBtn');
    const overlayVariant = document.getElementById('overlayVariant');
    if (vmCancelBtn) vmCancelBtn.addEventListener('click', closeVariantModal);
    if (overlayVariant) overlayVariant.addEventListener('click', closeVariantModal);
    if (vmAddBtn) vmAddBtn.addEventListener('click', confirmVariantAdd);
}

// -------- TOGGLE UTILS --------
function toggleMobileDrawer(show) {
    els.mobileDrawer.classList.toggle('open', show);
    els.mobileOverlay.classList.toggle('active', show);
}

function toggleCart(show) {
    els.cartSidebar.classList.toggle('open', show);
    els.cartOverlay.classList.toggle('active', show);
}

function toggleModal(modalEl, overlayEl, show) {
    if (show) {
        modalEl.classList.add('open');
        overlayEl.classList.add('active');
        if (modalEl === els.loginModal) els.adminPassInput.focus();
    } else {
        modalEl.classList.remove('open');
        overlayEl.classList.remove('active');
    }
}

// -------- SKELETON LOADING --------
function renderSkeleton(count = 8) {
    els.productGrid.innerHTML = Array.from({ length: count }).map(() => `
        <div class="product-card skeleton-card" style="position:relative;">
            <div class="skeleton skeleton-img"></div>
            <div class="product-info">
                <div class="skeleton skeleton-tag"></div>
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-desc"></div>
                <div class="product-footer">
                    <div class="skeleton skeleton-price"></div>
                    <div class="skeleton skeleton-btn"></div>
                </div>
            </div>
        </div>`).join('');
}

// -------- DATA FETCHING --------
async function loadProducts() {
    if (isFirstLoad) renderSkeleton();
    try {
        // Añadir timestamp para evitar el caché del navegador y forzar los datos más recientes
        const cacheBuster = '?t=' + new Date().getTime();
        const response = await fetch(WEB_APP_URL + cacheBuster, { cache: "no-store" });
        const data = await response.json();
        
        // Deep compare to avoid unnecessary re-renders
        if (JSON.stringify(products) !== JSON.stringify(data) || isFirstLoad) {
            products = data;
            isFirstLoad = false;
            renderCategories();
            filterBy(encodeURIComponent(currentDept), encodeURIComponent(currentCat)); // Re-apply current filter
            if (els.adminPanel.classList.contains('open')) renderAdminList();
        }
    } catch (e) {
        console.error("Load error:", e);
        if (products.length === 0) {
            els.productGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:4rem;">Error conectando a la base de datos. Verifica tu conexión.</div>`;
        }
    }
}

// -------- RENDER UI --------
function renderCategories() {
    const depts = [...new Set(products.map(p => p.dept ? String(p.dept).trim() : '').filter(Boolean))];
    
    // Ribbon Desktop/Tablet
    let ribbonHtml = `<button class="cat-btn ${currentDept === 'all' ? 'active' : ''}" onclick="filterBy('all', 'all')">Todos</button>`;
    
    // Mobile Drawer
    let mobileHtml = `<div class="mobile-cat-header ${currentDept === 'all' ? 'text-primary' : ''}" style="cursor:pointer;" onclick="filterBy('all', 'all'); toggleMobileDrawer(false);">Todos</div>`;

    depts.forEach(d => {
        const categories = [...new Set(products.filter(p => p.dept && String(p.dept).trim() === d).map(p => p.cat ? String(p.cat).trim() : '').filter(Boolean))];
        // Protege contra comillas simples que rompen el onClick
        const dEnc = encodeURIComponent(d).replace(/'/g, "%27");
        
        if (categories.length > 0) {
            const dropdownId = 'dropdown-' + d.replace(/\s+/g, '-');
            ribbonHtml += `
            <div class="cat-dropdown" id="${dropdownId}">
                <button class="cat-btn ${currentDept === d ? 'active' : ''}" onclick="toggleDropdown('${dropdownId}', event)">${d} ▾</button>
                <div class="dropdown-menu">
                    <div class="dropdown-item ${currentCat === 'all' && currentDept === d ? 'active' : ''}" onclick="filterBy('${dEnc}', 'all')">Ver todo lo de ${d}</div>
                    ${categories.map(c => {
                        const cEnc = encodeURIComponent(c).replace(/'/g, "%27");
                        return `<div class="dropdown-item ${currentCat === c ? 'active' : ''}" onclick="filterBy('${dEnc}', '${cEnc}')">${c}</div>`;
                    }).join('')}
                </div>
            </div>`;
            
            mobileHtml += `
            <div class="mobile-cat-group">
                <div class="mobile-cat-header ${currentDept === d ? 'text-primary' : ''}">
                    <span onclick="filterBy('${dEnc}', 'all'); toggleMobileDrawer(false);" style="flex-grow:1; cursor:pointer;">${d}</span>
                    <button class="mobile-expander" onclick="toggleMobileSubmenu(this)">▾</button>
                </div>
                <div class="mobile-subcat">
                    ${categories.map(c => {
                        const cEnc = encodeURIComponent(c).replace(/'/g, "%27");
                        return `<div class="mobile-cat-link" onclick="filterBy('${dEnc}', '${cEnc}'); toggleMobileDrawer(false);" style="padding: 0.5rem 0; cursor:pointer; ${currentCat === c ? 'color: var(--primary); font-weight: bold;' : ''}">${c}</div>`;
                    }).join('')}
                </div>
            </div>`;
        } else {
            ribbonHtml += `<button class="cat-btn ${currentDept === d ? 'active' : ''}" onclick="filterBy('${dEnc}', 'all')">${d}</button>`;
            
            mobileHtml += `
            <div class="mobile-cat-header ${currentDept === d ? 'text-primary' : ''}" style="cursor:pointer;" onclick="filterBy('${dEnc}', 'all'); toggleMobileDrawer(false);">
                 ${d}
            </div>`;
        }
    });

    els.categoryRibbon.innerHTML = ribbonHtml;
    els.mobileCategories.innerHTML = mobileHtml;
    
    // Update Search Filter Dropdown
    const searchFilter = document.getElementById('searchFilter');
    if (searchFilter) {
        let optionsHtml = `<option value="all">Todas las categorías</option>`;
        depts.forEach(d => {
            optionsHtml += `<option value="${encodeURIComponent(d)}">${d}</option>`;
        });
        searchFilter.innerHTML = optionsHtml;
        
        if (currentDept !== 'all') {
            searchFilter.value = encodeURIComponent(currentDept);
        }
    }
    
    // Update Admin bulk delete dropdowns if they exist
    if (typeof populateBulkDeleteOptions === 'function') {
        populateBulkDeleteOptions();
    }
}

window.toggleDropdown = function(id, e) {
    if(e) { e.stopPropagation(); e.preventDefault(); }
    document.querySelectorAll('.cat-dropdown').forEach(el => {
        if(el.id !== id) el.classList.remove('open');
    });
    document.getElementById(id).classList.toggle('open');
}

window.toggleMobileSubmenu = function(btn) {
    if(window.event && window.event.type === 'click') window.event.preventDefault();
    const subcat = btn.parentElement.nextElementSibling;
    if(subcat) subcat.classList.toggle('open');
}

window.filterBy = function(deptEnc, catEnc) {
    if(window.event && window.event.type === 'click') window.event.preventDefault();
    
    const dept = deptEnc === 'all' ? 'all' : decodeURIComponent(deptEnc);
    const cat = (catEnc === 'all' || catEnc === undefined) ? 'all' : decodeURIComponent(catEnc);
    
    currentDept = dept;
    currentCat = cat;
    
    // Limpiar búsqueda al cambiar de categoría para evitar que oculte productos
    currentSearch = '';
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    renderCategories(); // update active state on buttons

    applyFilters();
}

window.applyFilters = function() {
    let filtered = products;
    if (currentDept !== 'all') {
        filtered = filtered.filter(p => p.dept && String(p.dept).trim() === currentDept);
    }
    if (currentCat !== 'all') {
        filtered = filtered.filter(p => p.cat && String(p.cat).trim() === currentCat);
    }
    if (currentSearch.trim() !== '') {
        const term = currentSearch.toLowerCase();
        filtered = filtered.filter(p => 
            (p.name && String(p.name).toLowerCase().includes(term)) || 
            (p.ref && String(p.ref).toLowerCase().includes(term))
        );
    }
    
    renderProducts(filtered);
}

function renderProducts(items) {
    if (!items || items.length === 0) {
        els.productGrid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 4rem; color: var(--gray-400);">No se encontraron productos en esta categoría.</div>';
        return;
    }
    
    els.productGrid.innerHTML = items.map(p => {
        // ✅ Badge de stock
        const stock = parseInt(p.stock);
        let stockBadge = '';
        if (!isNaN(stock)) {
            if (stock === 0) {
                stockBadge = `<span style="position:absolute; top:8px; right:8px; background:#e53e3e; color:white; font-size:0.7rem; font-weight:700; padding:3px 8px; border-radius:20px;">Agotado</span>`;
            } else if (stock <= 3) {
                stockBadge = `<span style="position:absolute; top:8px; right:8px; background:#d97706; color:white; font-size:0.7rem; font-weight:700; padding:3px 8px; border-radius:20px;">Últimas ${stock}</span>`;
            }
        }
        
        // ✅ Badge Nueva Colección
        const isNew = p.isNew === true || String(p.isNew).toLowerCase() === 'true' || p.isNew === 1 || p.isNew === '1';
        const newBadge = isNew ? `<span class="badge-new">✨ Nueva Colección</span>` : '';
        
        const isOutOfStock = !isNaN(stock) && stock === 0;
        // Escape el nombre para usarlo en atributos HTML inline
        const safeName = String(p.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const safeRef  = String(p.ref  || '').replace(/'/g, "\\'");
        
        // Evita que comillas dentro del link de la imagen rompan el HTML
        let rawImg = p.img || 'assets/logo_empresa.png';
        const safeImg = String(rawImg).replace(/"/g, '%22').trim();
        
        // Estilos del botón según disponibilidad
        const btnStyle = isOutOfStock
            ? 'padding: 0.5rem 1rem; opacity:0.4; cursor:not-allowed;'
            : 'padding: 0.5rem 1rem;';
        
        return `
        <div class="product-card${isNew ? ' is-new' : ''}" style="position:relative;">
            ${newBadge}
            ${stockBadge}
            <img src="${safeImg}" alt="${safeName}" class="product-img" loading="lazy" style="cursor: zoom-in; ${isOutOfStock ? 'opacity:0.5;' : ''}" onclick="openImageZoomById('${p.id}')" onerror="this.src='assets/logo_empresa.png'">
            <div class="product-info">
                <span class="product-tag">${p.dept || 'Genérico'} ${p.cat ? '| '+p.cat : ''}</span>
                <h3 class="product-title">${p.name}</h3>
                <p class="product-desc">Ref: ${p.ref || 'N/A'}</p>
                <div class="product-footer">
                    <span class="product-price">$${formatPrice(p.price)}</span>
                    <div style="display:flex; gap:6px; align-items:center;">
                        <button onclick="shareProduct('${safeName}','${safeRef}','${formatPrice(p.price)}')" class="btn-share" title="Compartir por WhatsApp">&#x1F4E4;</button>
                        <button onclick="addToCart('${p.id}')" class="btn btn-primary" style="${btnStyle}" ${isOutOfStock ? 'disabled' : ''}>Añadir</button>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

// -------- COMPARTIR PRODUCTO POR WHATSAPP --------
window.shareProduct = function(name, ref, price) {
    const url = window.location.href.split('?')[0];
    const msg = `🛍️ *${name}*\n📦 Ref: ${ref}\n💰 Precio: $${price}\n\n¡Mira este producto en nuestro catálogo!\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
};

function renderAdminList() {
    let list = products;
    const adminSearchInput = document.getElementById('adminSearchInput');
    if (adminSearchInput && adminSearchInput.value.trim() !== '') {
        const term = adminSearchInput.value.trim().toLowerCase();
        list = list.filter(p => 
            (p.name && String(p.name).toLowerCase().includes(term)) || 
            (p.ref && String(p.ref).toLowerCase().includes(term))
        );
    }

    if (list.length === 0) {
        els.adminProductGrid.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--gray-400);">No se encontraron productos.</div>';
        return;
    }

    els.adminProductGrid.innerHTML = list.map(p => `
        <div class="admin-prod-item">
            <div style="flex-grow:1; display:flex; align-items:center; gap:10px;">
                <img src="${p.img}" style="width:40px; height:40px; object-fit:cover; border-radius:4px; background:#000;">
                <div>
                   <div style="font-weight:600; font-size:0.95rem;">${p.name} ${(p.isNew === true || String(p.isNew).toLowerCase() === 'true' || p.isNew === 1 || p.isNew === '1') ? '<span style="font-size:0.65rem;background:linear-gradient(100deg,#b8860b,#d4af37,#f5e17a,#d4af37,#b8860b);color:#1a1a2e;padding:2px 7px;border-radius:10px;font-weight:800;margin-left:5px;">✨ NUEVO</span>' : ''}</div>
                   <div style="font-size:0.8rem; color:var(--gray-400);">Ref: ${p.ref} - $${formatPrice(p.price)}</div>
                </div>
            </div>
            <button onclick="deleteProduct('${p.id}')" class="icon-btn" style="color:var(--danger); padding:8px;" title="Eliminar">✕</button>
        </div>
    `).join('');
}

// -------- VARIANT SELECTION MODAL --------
function openVariantModal(pid) {
    const p = products.find(i => String(i.id) === String(pid));
    if (!p) return;
    
    _vmPendingProduct = p;
    _vmSelectedColor = null;
    _vmSelectedSize = null;
    
    // Set product name
    document.getElementById('vmProductName').textContent = p.name;
    
    // Render color chips
    const colorContainer = document.getElementById('vmColorChips');
    if (availableColors.length > 0) {
        document.getElementById('vmColorSection').style.display = '';
        colorContainer.innerHTML = `<div class="color-chip-label" onclick="selectVmColor(null, this)">
            <div class="color-chip chip-na" style="background: repeating-linear-gradient(45deg, var(--gray-700), var(--gray-700) 3px, var(--bg-dark) 3px, var(--bg-dark) 6px); border: 1px dashed var(--gray-500);"></div>
            <span>N/A</span>
        </div>` + availableColors.map(c => `
            <div class="color-chip-label" onclick="selectVmColor('${c.name}', this)">
                <div class="color-chip" style="background:${c.hex};" title="${c.name}" data-color="${c.name}"></div>
                <span>${c.name}</span>
            </div>
        `).join('');
    } else {
        document.getElementById('vmColorSection').style.display = 'none';
    }
    
    // Render size chips
    const sizeContainer = document.getElementById('vmSizeChips');
    if (availableSizes.length > 0) {
        document.getElementById('vmSizeSection').style.display = '';
        sizeContainer.innerHTML = `<button type="button" class="size-chip chip-na" onclick="selectVmSize(null, this)">N/A</button>` +
            availableSizes.map(s => `
            <button type="button" class="size-chip" onclick="selectVmSize('${s}', this)">${s}</button>
        `).join('');
    } else {
        document.getElementById('vmSizeSection').style.display = 'none';
    }
    
    // Show modal
    document.getElementById('variantModal').classList.add('open');
    document.getElementById('overlayVariant').classList.add('active');
}

function closeVariantModal() {
    document.getElementById('variantModal').classList.remove('open');
    document.getElementById('overlayVariant').classList.remove('active');
    _vmPendingProduct = null;
}

window.selectVmColor = function(colorName, el) {
    _vmSelectedColor = colorName;
    document.querySelectorAll('#vmColorChips .color-chip').forEach(c => c.classList.remove('selected'));
    const chip = el.querySelector('.color-chip') || el;
    chip.classList.add('selected');
}

window.selectVmSize = function(size, el) {
    _vmSelectedSize = size;
    document.querySelectorAll('#vmSizeChips .size-chip').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
}

function confirmVariantAdd() {
    if (!_vmPendingProduct) return;
    
    const p = _vmPendingProduct;
    const color = _vmSelectedColor || null;
    const size = _vmSelectedSize || null;
    
    // Cart key = id + color + size for unique combos
    const cartKey = `${p.id}_${color || 'nocolor'}_${size || 'nosize'}`;
    
    const exist = cart.find(i => i.cartKey === cartKey);
    if (exist) {
        exist.quantity++;
    } else {
        cart.push({
            ...p,
            cartKey: cartKey,
            selectedColor: color,
            selectedColorHex: color ? (availableColors.find(c => c.name === color) || {}).hex || '' : '',
            selectedSize: size,
            quantity: 1
        });
    }
    
    closeVariantModal();
    updateCartUI();
    toggleCart(true);
}

// -------- CART LOGIC --------
window.addToCart = function(pid) {
    const p = products.find(i => String(i.id) === String(pid));
    if (!p) return;
    
    // If there are colors or sizes available, show variant modal
    if (availableColors.length > 0 || availableSizes.length > 0) {
        openVariantModal(pid);
        return;
    }
    
    // No variants: add directly with a cartKey
    const cartKey = `${pid}_nocolor_nosize`;
    const exist = cart.find(i => i.cartKey === cartKey);
    if (exist) {
        exist.quantity++;
    } else {
        cart.push({...p, cartKey: cartKey, selectedColor: null, selectedColorHex: '', selectedSize: null, quantity: 1});
    }
    
    updateCartUI();
    toggleCart(true);
}

window.changeQty = function(cartKey, delta) {
    const item = cart.find(c => c.cartKey === cartKey);
    if (!item) return;
    
    item.quantity += delta;
    if (item.quantity <= 0) {
        cart = cart.filter(c => c.cartKey !== cartKey);
    }
    updateCartUI();
}

function updateCartUI() {
    const totalItems = cart.reduce((acc, i) => acc + i.quantity, 0);
    els.cartCount.innerText = totalItems;
    
    // ✅ Guardar carrito en localStorage automáticamente
    localStorage.setItem('brilho_cart', JSON.stringify(cart));
    
    if (cart.length === 0) {
        els.cartItems.innerHTML = '<div style="text-align:center; color:var(--gray-400); margin-top: 2rem;">Tu carrito está vacío</div>';
        els.cartTotal.innerText = '$0';
        return;
    }

    els.cartItems.innerHTML = cart.map(i => {
        // Variant tags
        let variantTags = '';
        if (i.selectedColor || i.selectedSize) {
            variantTags = '<div class="cart-variant-tags">';
            if (i.selectedColor) {
                variantTags += `<span class="cart-vtag cart-vtag-color"><span class="cart-vtag-dot" style="background:${i.selectedColorHex || '#888'}"></span>${i.selectedColor}</span>`;
            }
            if (i.selectedSize) {
                variantTags += `<span class="cart-vtag cart-vtag-size">Talla ${i.selectedSize}</span>`;
            }
            variantTags += '</div>';
        }
        
        const safeCartKey = (i.cartKey || i.id).replace(/'/g, "\\'");
        return `
        <div class="cart-item">
            <img src="${i.img || 'assets/logo_empresa.png'}">
            <div class="cart-item-info">
                <h4>${i.name}</h4>
                ${variantTags}
                <p>$${formatPrice(i.price)}</p>
            </div>
            <div class="qty-controls">
                <button class="qty-btn" onclick="changeQty('${safeCartKey}', -1)">−</button>
                <span style="font-weight:bold; min-width: 20px; text-align:center;">${i.quantity}</span>
                <button class="qty-btn" onclick="changeQty('${safeCartKey}', 1)">+</button>
            </div>
        </div>
    `}).join('');
    
    const t = cart.reduce((s, i) => s + (parsePrice(i.price) * i.quantity), 0);
    els.cartTotal.innerText = `$${formatPrice(t)}`;
}

// -------- ORDER CHECKOUT --------
function handleOrderSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('custName').value.trim();
    const idNum = document.getElementById('custId').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    const addr = document.getElementById('custAddr').value.trim();
    const transport = document.getElementById('custTransport').value.trim();
    const sellerEl = document.getElementById('custSeller');
    const seller = sellerEl ? sellerEl.value.trim() : '';
    const email = document.getElementById('custEmail') ? document.getElementById('custEmail').value.trim() : '';
    const total = cart.reduce((s, i) => s + (parsePrice(i.price) * i.quantity), 0);
    const numTicket = 'PED-' + Date.now().toString().slice(-6);
    
    // Build order lines with color/size
    let itemLines = '';
    cart.forEach(i => {
        let extras = '';
        if (i.selectedColor) extras += ` | Color: ${i.selectedColor}`;
        if (i.selectedSize) extras += ` | Talla: ${i.selectedSize}`;
        itemLines += `- ${i.name} (Ref: ${i.ref || 'N/A'}${extras}) x${i.quantity} = $${formatPrice(parsePrice(i.price) * i.quantity)}\n`;
    });

    // 1️⃣ WhatsApp al cliente/pedido principal
    let msg = `*NUEVO PEDIDO - CATÁLOGO PREMIUM*\n*N° ${numTicket}*\n\n`;
    msg += `*Cliente:* ${name}\n`;
    msg += `*Cédula/RIF:* ${idNum}\n`;
    msg += `*Teléfono:* ${phone}\n`;
    msg += `*Dirección:* ${addr}\n`;
    msg += `*Agencia de Envío:* ${transport}\n`;
    if (seller) msg += `*Vendedor:* ${seller}\n`;
    msg += `\n*Resumen de compra:*\n${itemLines}`;
    msg += `\n*TOTAL A PAGAR:* $${formatPrice(total)}`;

    const encodedMsg = encodeURIComponent(msg);
    window.open(`https://wa.me/${BUSINESS_PHONE}?text=${encodedMsg}`, '_blank');

    // 2️⃣ ✅ NOTIFICACIÓN AUTOMÁTICA AL ADMINISTRADOR vía WhatsApp (incluye factura completa)
    setTimeout(() => {
        let adminMsg = `🔔 *NUEVO PEDIDO RECIBIDO*\n*N° ${numTicket}*\n\n`;
        adminMsg += `👤 *Cliente:* ${name}\n`;
        adminMsg += `📱 *Teléfono:* ${phone}\n`;
        adminMsg += `📋 *Cédula/RIF:* ${idNum}\n`;
        adminMsg += `📍 *Dirección:* ${addr}\n`;
        adminMsg += `🚚 *Agencia:* ${transport}\n`;
        if (seller) adminMsg += `🏷️ *Vendedor:* ${seller}\n`;
        adminMsg += `\n📦 *Productos:*\n${itemLines}`;
        adminMsg += `\n💰 *TOTAL:* $${formatPrice(total)}`;
        const adminEncoded = encodeURIComponent(adminMsg);
        window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${adminEncoded}`, '_blank');
    }, 1500);

    // 3️⃣ ✅ CORREO AUTOMÁTICO "EN SILENCIO" AL CLIENTE
    if (email) {
        if (typeof html2pdf !== 'undefined') {
            const clientData = { name, idNum, phone, transport, addr, seller };
            // Generar PDF en base64 y enviarlo al servidor
            generateTicketPDF(clientData, 'get_base64').then(base64Pdf => {
                let body = `Estimado(a) ${name},\n\nResumen de su pedido (${numTicket}):\n\n`;
                cart.forEach(i => {
                    let extras = '';
                    if (i.selectedColor) extras += ` | Color: ${i.selectedColor}`;
                    if (i.selectedSize) extras += ` | Talla: ${i.selectedSize}`;
                    body += `- ${i.name} (Ref: ${i.ref || 'N/A'}${extras}) x${i.quantity} = $${formatPrice(parsePrice(i.price) * i.quantity)}\n`;
                });
                body += `\nTOTAL A PAGAR: $${formatPrice(total)}\n`;
                if (seller) body += `Vendedor: ${seller}\n`;
                body += `\nGracias por su compra. — BRILHO JOYAS`;

                fetch(WEB_APP_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    body: JSON.stringify({
                        action: 'SEND_EMAIL',
                        email: email,
                        subject: `Factura de Pedido ${numTicket} - BRILHO JOYAS`,
                        body: body,
                        pdfBase64: base64Pdf,
                        fileName: `Factura_${numTicket}.pdf`
                    })
                }).catch(err => console.warn('Error enviando correo:', err));
            });
        } else {
            // Respaldo: mailto en segundo plano (abre cliente de correo)
            let body = `Estimado(a) ${name},\n\nResumen de su pedido (${numTicket}):\n\n`;
            cart.forEach(i => {
                let extras = '';
                if (i.selectedColor) extras += ` | Color: ${i.selectedColor}`;
                if (i.selectedSize) extras += ` | Talla: ${i.selectedSize}`;
                body += `- ${i.name} (Ref: ${i.ref || 'N/A'}${extras}) x${i.quantity} = $${formatPrice(parsePrice(i.price) * i.quantity)}\n`;
            });
            body += `\nTOTAL A PAGAR: $${formatPrice(total)}\n`;
            if (seller) body += `Vendedor: ${seller}\n`;
            body += `\nGracias por su compra. — BRILHO JOYAS`;
            // Abrir en iframe oculto para que sea más silencioso
            const mailLink = `mailto:${email}?subject=${encodeURIComponent('Factura de Pedido ' + numTicket + ' - BRILHO JOYAS')}&body=${encodeURIComponent(body)}`;
            const mailFrame = document.createElement('iframe');
            mailFrame.style.display = 'none';
            mailFrame.src = mailLink;
            document.body.appendChild(mailFrame);
            setTimeout(() => document.body.removeChild(mailFrame), 3000);
        }
    }

    // 4️⃣ Generar ticket PDF automáticamente
    const clientData = { name, idNum, phone, transport, addr, seller };
    generateTicketPDF(clientData, 'auto');

    // Clear state
    cart = [];
    localStorage.removeItem('brilho_cart');
    updateCartUI();
    els.checkoutForm.reset();
    toggleModal(els.checkoutModal, els.modalOverlayCheckout, false);
}

// -------- IMAGE ZOOM INTERACTIVO --------
let _zoomScale = 1;
let _zoomX = 0;
let _zoomY = 0;
let _isDragging = false;
let _dragStart = { x: 0, y: 0 };
let _pinchDist = null;

function _applyZoomTransform() {
    const img = document.getElementById('zoomedImage');
    if (!img) return;
    img.style.transform = `translate(${_zoomX}px, ${_zoomY}px) scale(${_zoomScale})`;
    // Mostrar u ocultar reset btn
    const resetBtn = document.getElementById('zoomResetBtn');
    if (resetBtn) resetBtn.style.opacity = _zoomScale !== 1 ? '1' : '0.5';
}

function _resetZoom() {
    _zoomScale = 1;
    _zoomX = 0;
    _zoomY = 0;
    _applyZoomTransform();
}

window.openImageZoomById = function(id) {
    const p = products.find(prod => String(prod.id) === String(id));
    if (p && p.img) {
        window.openImageZoom(p.img);
    } else {
        window.openImageZoom('assets/logo_empresa.png');
    }
};

window.openImageZoom = function(src) {
    _resetZoom();
    const img = document.getElementById('zoomedImage');
    img.src = src;
    img.style.transform = '';
    document.getElementById('imageZoomModal').classList.add('open');
    document.getElementById('overlayImageZoom').classList.add('active');

    // Actualizar contador
    document.getElementById('zoomLevelLabel').textContent = '100%';

    // ── WHEEL ZOOM (centrado en el cursor) ──
    img.onwheel = (e) => {
        e.preventDefault();
        const prevScale = _zoomScale;
        const delta = e.deltaY < 0 ? 0.18 : -0.18;
        _zoomScale = Math.min(6, Math.max(1, _zoomScale + delta));

        if (_zoomScale === 1) {
            _zoomX = 0; _zoomY = 0;
        } else {
            // Zoom hacia la posición del cursor
            const wrapper = document.querySelector('.zoom-image-wrapper');
            const rect = wrapper ? wrapper.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
            const cx = e.clientX - (rect.left + rect.width / 2);
            const cy = e.clientY - (rect.top + rect.height / 2);
            const scaleRatio = _zoomScale / prevScale;
            _zoomX = cx - (cx - _zoomX) * scaleRatio;
            _zoomY = cy - (cy - _zoomY) * scaleRatio;
        }

        _applyZoomTransform();
        document.getElementById('zoomLevelLabel').textContent = Math.round(_zoomScale * 100) + '%';
    };

    // ── MOUSE DRAG ──
    img.onmousedown = (e) => {
        if (_zoomScale <= 1) return;
        _isDragging = true;
        _dragStart = { x: e.clientX - _zoomX, y: e.clientY - _zoomY };
        img.style.cursor = 'grabbing';
        e.preventDefault();
    };
    // Use named handlers so they can be cleanly removed on close
    window._zoomMouseMove = (e) => {
        if (!_isDragging) return;
        _zoomX = e.clientX - _dragStart.x;
        _zoomY = e.clientY - _dragStart.y;
        _applyZoomTransform();
    };
    window._zoomMouseUp = () => {
        _isDragging = false;
        img.style.cursor = _zoomScale > 1 ? 'grab' : 'zoom-in';
    };
    window.addEventListener('mousemove', window._zoomMouseMove);
    window.addEventListener('mouseup', window._zoomMouseUp);

    // ── TOUCH PINCH ──
    let _pinchCenter = { x: 0, y: 0 };
    img.ontouchstart = (e) => {
        if (e.touches.length === 2) {
            _pinchDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            // Centro del gesto pinch
            const wrapper = document.querySelector('.zoom-image-wrapper');
            const rect = wrapper ? wrapper.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
            _pinchCenter = {
                x: ((e.touches[0].clientX + e.touches[1].clientX) / 2) - (rect.left + rect.width / 2),
                y: ((e.touches[0].clientY + e.touches[1].clientY) / 2) - (rect.top + rect.height / 2)
            };
        } else if (e.touches.length === 1 && _zoomScale > 1) {
            _isDragging = true;
            _dragStart = { x: e.touches[0].clientX - _zoomX, y: e.touches[0].clientY - _zoomY };
        }
    };
    img.ontouchmove = (e) => {
        e.preventDefault();
        if (e.touches.length === 2 && _pinchDist !== null) {
            const newDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const prevScale = _zoomScale;
            const ratio = newDist / _pinchDist;
            _zoomScale = Math.min(6, Math.max(1, _zoomScale * ratio));
            _pinchDist = newDist;
            if (_zoomScale === 1) {
                _zoomX = 0; _zoomY = 0;
            } else {
                // Zoom centrado en el punto del pinch
                const scaleRatio = _zoomScale / prevScale;
                _zoomX = _pinchCenter.x - (_pinchCenter.x - _zoomX) * scaleRatio;
                _zoomY = _pinchCenter.y - (_pinchCenter.y - _zoomY) * scaleRatio;
            }
            _applyZoomTransform();
            document.getElementById('zoomLevelLabel').textContent = Math.round(_zoomScale * 100) + '%';
        } else if (e.touches.length === 1 && _isDragging) {
            _zoomX = e.touches[0].clientX - _dragStart.x;
            _zoomY = e.touches[0].clientY - _dragStart.y;
            _applyZoomTransform();
        }
    };
    img.ontouchend = () => {
        _isDragging = false;
        _pinchDist = null;
    };
};

window.toggleImageZoom = function(show) {
    if (!show) {
        document.getElementById('imageZoomModal').classList.remove('open');
        document.getElementById('overlayImageZoom').classList.remove('active');
        // Limpiar eventos correctamente
        const img = document.getElementById('zoomedImage');
        if (img) { img.onwheel = null; img.onmousedown = null; }
        if (window._zoomMouseMove) window.removeEventListener('mousemove', window._zoomMouseMove);
        if (window._zoomMouseUp)   window.removeEventListener('mouseup',  window._zoomMouseUp);
        window._zoomMouseMove = null;
        window._zoomMouseUp   = null;
        _resetZoom();
    }
};

window.zoomIn = function() {
    _zoomScale = Math.min(5, _zoomScale + 0.25);
    _applyZoomTransform();
    document.getElementById('zoomLevelLabel').textContent = Math.round(_zoomScale * 100) + '%';
};
window.zoomOut = function() {
    _zoomScale = Math.max(1, _zoomScale - 0.25);
    if (_zoomScale === 1) { _zoomX = 0; _zoomY = 0; }
    _applyZoomTransform();
    document.getElementById('zoomLevelLabel').textContent = Math.round(_zoomScale * 100) + '%';
};
window.zoomReset = function() {
    _resetZoom();
    document.getElementById('zoomLevelLabel').textContent = '100%';
};

// -------- ADMIN FEATURES --------

// Vista previa de imagen antes de subir al catálogo
window.previewAdminImage = function(input) {
    const wrap = document.getElementById('imgPreviewWrap');
    const preview = document.getElementById('imgPreview');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
            preview.src = e.target.result;
            wrap.style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    } else {
        wrap.style.display = 'none';
        preview.src = '';
    }
};

function handleLogin() {
    if (els.adminPassInput.value === ADMIN_PASS) {
        toggleModal(els.loginModal, els.modalOverlayLogin, false);
        els.adminPassInput.value = '';
        renderAdminList();
        if (typeof populateBulkDeleteOptions === 'function') populateBulkDeleteOptions();
        toggleModal(els.adminPanel, els.modalOverlayAdmin, true);
    } else {
        alert("Contraseña incorrecta");
        els.adminPassInput.value = '';
        els.adminPassInput.focus();
    }
}

// IMAGE COMPRESSOR — Máxima calidad para zoom premium
// Estrategia escalonada: 1600px/0.92 → 1200px/0.85 → 900px/0.75
function compressImage(file, maxDist = 1600) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const tryCompress = (size, quality) => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > size) { height = Math.round(height * size / width); width = size; }
                    } else {
                        if (height > size) { width = Math.round(width * size / height); height = size; }
                    }

                    // Doble escala para máxima nitidez (supersampling)
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);

                    return canvas.toDataURL('image/webp', quality);
                };

                // Intento 1: 1600px a 0.92 de calidad — máxima nitidez para zoom
                let result = tryCompress(1600, 0.92);

                // Si supera el límite, reducir a 1200px / 0.85
                if (result.length > 150000) {
                    result = tryCompress(1200, 0.85);
                }

                // Último recurso: 900px / 0.75
                if (result.length > 150000) {
                    result = tryCompress(900, 0.75);
                }

                resolve(result);
            };
            img.onerror = error => reject(error);
        };
        reader.onerror = error => reject(error);
    });
}

async function handleAddProduct(e) {
    e.preventDefault();
    const fileInput = document.getElementById('pFile');
    const file = fileInput.files[0];
    
    if (!file) {
        els.adminStatus.innerText = "❌ Debes añadir una foto";
        return;
    }
    
    els.saveProductBtn.disabled = true;
    els.adminStatus.innerText = "⏳ Optimizando imagen...";

    try {
        const compressedBase64 = await compressImage(file, 1600); // 1600px para máxima calidad en zoom
        
        if (compressedBase64.length > 150000) {
            els.adminStatus.innerText = "❌ La imagen es muy compleja/grande. Usa otra foto.";
            els.saveProductBtn.disabled = false;
            return;
        }

        const payload = {
            name: document.getElementById('pName').value.trim(),
            ref: document.getElementById('pRef').value.trim(),
            price: document.getElementById('pPrice').value,
            stock: document.getElementById('pStock') ? document.getElementById('pStock').value : '',
            dept: document.getElementById('pDept').value.trim(),
            cat: document.getElementById('pCategory').value.trim(),
            desc: document.getElementById('pDesc').value.trim(),
            isNew: document.getElementById('pIsNew') ? document.getElementById('pIsNew').checked : false,
            img: compressedBase64
        };
        
        els.adminStatus.innerText = "🚀 Enviando a Google Sheets...";
        
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(payload)
        });
        
        els.adminStatus.innerText = "✅ Producto agregado correctamente";
        
        setTimeout(() => {
            els.productForm.reset();
            // Ocultar vista previa al limpiar el formulario
            const wrap = document.getElementById('imgPreviewWrap');
            if (wrap) wrap.style.display = 'none';
            els.adminStatus.innerText = "";
            els.saveProductBtn.disabled = false;
            loadProducts();
        }, 1500);
        
    } catch (err) {
        console.error(err);
        els.adminStatus.innerText = "❌ Ocurrió un error al procesar/subir";
        els.saveProductBtn.disabled = false;
    }
}

window.deleteProduct = async function(id) {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    try {
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: 'DELETE', id: id })
        });
        // Optimistic delete — quitar el producto del array local sin recargar
        products = products.filter(p => String(p.id) !== String(id));
        renderAdminList();
        renderCategories();
        // ✅ CORREGIDO: usar las variables correctas de estado
        filterBy(encodeURIComponent(currentDept), encodeURIComponent(currentCat));
        
        // Refresh silently para confirmar el estado real del servidor
        setTimeout(loadProducts, 2000);
    } catch (e) {
        alert("Error al intentar eliminar. Revisa tu conexión.");
    }
}

// -------- GESTIÓN MASIVA (ADMIN) --------
window.populateBulkDeleteOptions = function() {
    const depts = [...new Set(products.map(p => p.dept ? String(p.dept).trim() : '').filter(Boolean))];
    const deptSelect = document.getElementById('delDeptSelect');
    if (!deptSelect) return;
    
    const currentVal = deptSelect.value;
    deptSelect.innerHTML = `<option value="">-- Seleccionar Dept --</option>` + 
                           depts.map(d => `<option value="${d}">${d}</option>`).join('');
                           
    if (depts.includes(currentVal)) deptSelect.value = currentVal;
    window.updateDelCatSelect();
};

window.updateDelCatSelect = function() {
    const dept = document.getElementById('delDeptSelect').value;
    const catSelect = document.getElementById('delCatSelect');
    if (!catSelect) return;
    
    if (!dept) {
        catSelect.innerHTML = `<option value="all">Todas las categorías</option>`;
        return;
    }
    
    const categories = [...new Set(products.filter(p => p.dept && String(p.dept).trim() === dept).map(p => p.cat ? String(p.cat).trim() : '').filter(Boolean))];
    catSelect.innerHTML = `<option value="all">Todas las categorías</option>` + 
                          categories.map(c => `<option value="${c}">${c}</option>`).join('');
};

window.deleteBulk = async function() {
    const dept = document.getElementById('delDeptSelect').value;
    const cat = document.getElementById('delCatSelect').value;
    const statusEl = document.getElementById('bulkDeleteStatus');
    
    if (!dept) {
        alert("Por favor selecciona un departamento primero.");
        return;
    }
    
    let toDelete = products.filter(p => p.dept && String(p.dept).trim() === dept);
    if (cat !== 'all') {
        toDelete = toDelete.filter(p => p.cat && String(p.cat).trim() === cat);
    }
    
    if (toDelete.length === 0) {
        alert("No hay productos en este grupo.");
        return;
    }
    
    const msg = cat === 'all' 
        ? `¿Estás seguro de eliminar TODO el departamento "${dept}"? (${toDelete.length} productos serán borrados)`
        : `¿Estás seguro de eliminar la categoría "${cat}" dentro de "${dept}"? (${toDelete.length} productos serán borrados)`;
        
    if (!confirm(msg)) return;
    if (!confirm("⚠️ ¡ADVERTENCIA FINAL! Esta acción no se puede deshacer y borrará permanentemente todos estos productos del catálogo. ¿Estás absolutamente seguro?")) return;
    
    statusEl.innerText = `⏳ Eliminando ${toDelete.length} productos...`;
    statusEl.style.color = 'var(--text-main)';
    
    // Deshabilitar botón temporalmente para evitar doble clic
    const btn = document.querySelector('button[onclick="deleteBulk()"]');
    if(btn) btn.disabled = true;
    
    try {
        let successCount = 0;
        // Se borran secuencialmente para no saturar el Google Apps Script
        for (const p of toDelete) {
            statusEl.innerText = `⏳ Borrando ${successCount + 1}/${toDelete.length} (${p.name})...`;
            await fetch(WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify({ action: 'DELETE', id: p.id })
            });
            successCount++;
            
            // Borrado optimista local para que la UI se actualice rápido
            products = products.filter(prod => String(prod.id) !== String(p.id));
        }
        
        statusEl.innerText = `✅ Se eliminaron ${successCount} productos.`;
        statusEl.style.color = '#25d366';
        
        renderAdminList();
        renderCategories();
        filterBy(encodeURIComponent(currentDept), encodeURIComponent(currentCat));
        
        setTimeout(() => { statusEl.innerText = ''; }, 4000);
        setTimeout(loadProducts, 2000); // Sincronización en segundo plano
        
    } catch (e) {
        console.error(e);
        statusEl.innerText = "❌ Error. Algunos productos no se eliminaron. Revisa tu conexión.";
        statusEl.style.color = 'var(--danger)';
    } finally {
        if(btn) btn.disabled = false;
    }
}

// -------- UTILS --------
function formatPrice(p) { 
    const n = parsePrice(p); 
    return n % 1 === 0 ? n.toLocaleString() : n.toLocaleString(undefined, {minimumFractionDigits:1}); 
}
function parsePrice(p) { 
    return parseFloat(String(p).replace(/[$\s]/g, '').replace(',', '.')) || 0; 
}

// -------- TICKET PDF GENERATOR --------
function generateTicketPDF(client = {}, action = 'download', emailAddress = '') {
    // Use current cart for PDF - may be called after checkout clears cart, so we use a snapshot
    const cartSnapshot = (action === 'auto') ? _lastCartSnapshot : cart;
    if (!cartSnapshot || cartSnapshot.length === 0) return;
    
    const total = cartSnapshot.reduce((s, i) => s + (parsePrice(i.price) * i.quantity), 0);
    const now = new Date();
    const fecha = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
    const numTicket = 'TKT-' + Date.now().toString().slice(-6);

    const sellerRow = client.seller ? `
                <tr><td style="width: 140px; color: #555; padding: 4px 8px;"><strong>Vendedor:</strong></td><td style="padding: 4px 8px; color: #b8860b; font-weight: 600;">${client.seller}</td></tr>
    ` : '';

    const clientRows = client.name ? `
        <div style="background: #fffbf0; border: 1px solid #d4af37; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px;">
            <h3 style="font-size: 0.9rem; color: #d4af37; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">Datos del Cliente</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
                <tr><td style="width: 140px; color: #555; padding: 4px 8px;"><strong>Nombre:</strong></td><td style="padding: 4px 8px;">${client.name}</td></tr>
                <tr><td style="width: 140px; color: #555; padding: 4px 8px;"><strong>Cédula/RIF:</strong></td><td style="padding: 4px 8px;">${client.idNum}</td></tr>
                <tr><td style="width: 140px; color: #555; padding: 4px 8px;"><strong>Teléfono:</strong></td><td style="padding: 4px 8px;">${client.phone}</td></tr>
                <tr><td style="width: 140px; color: #555; padding: 4px 8px;"><strong>Agencia Envío:</strong></td><td style="padding: 4px 8px;">${client.transport}</td></tr>
                <tr><td style="width: 140px; color: #555; padding: 4px 8px;"><strong>Dirección:</strong></td><td style="padding: 4px 8px;">${client.addr}</td></tr>
                ${sellerRow}
            </table>
        </div>
    ` : '';

    const rows = cartSnapshot.map((i, index) => {
        let details = i.name;
        let variantInfo = '';
        if (i.selectedColor) variantInfo += `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${i.selectedColorHex||'#888'};margin-right:3px;vertical-align:middle;border:1px solid #ddd;"></span>${i.selectedColor}`;
        if (i.selectedSize) variantInfo += `${i.selectedColor ? ' · ' : ''}Talla: ${i.selectedSize}`;
        if (variantInfo) details += `<div style="font-size:0.75rem; color:#888; margin-top:2px;">${variantInfo}</div>`;
        
        return `
        <tr style="${index % 2 !== 0 ? 'background: #f9f9f9;' : ''}">
            <td style="padding: 10px 12px; font-size: 0.88rem; border-bottom: 1px solid #eee;">${details}</td>
            <td style="padding: 10px 12px; font-size: 0.88rem; border-bottom: 1px solid #eee; text-align:center">${i.ref || '-'}</td>
            <td style="padding: 10px 12px; font-size: 0.88rem; border-bottom: 1px solid #eee; text-align:center">${i.quantity}</td>
            <td style="padding: 10px 12px; font-size: 0.88rem; border-bottom: 1px solid #eee; text-align:right">$${formatPrice(parsePrice(i.price))}</td>
            <td style="padding: 10px 12px; font-size: 0.88rem; border-bottom: 1px solid #eee; text-align:right">$${formatPrice(parsePrice(i.price) * i.quantity)}</td>
        </tr>`;
    }).join('');

    const ticketHTML = `
    <div style="font-family: 'Inter', sans-serif; background: #fff; color: #222; padding: 40px; max-width: 680px; margin: 0 auto; box-sizing: border-box;">
        <div style="text-align: center; border-bottom: 3px solid #d4af37; padding-bottom: 20px; margin-bottom: 24px;">
            <h1 style="font-size: 2rem; letter-spacing: 4px; color: #1a1a2e; margin: 0;">BRILHO <span style="color: #d4af37;">JOYAS</span></h1>
            <div style="color: #888; font-size: 0.85rem; letter-spacing: 2px; margin-top: 4px;">Joyas • Silver • Steel &mdash; Catálogo Online</div>
        </div>
        <div style="display: flex; justify-content: space-between; background: #f8f8f8; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 0.85rem;">
            <div><span style="color: #555;">Ticket N°: </span><strong style="color: #222;">${numTicket}</strong></div>
            <div><span style="color: #555;">Fecha: </span><strong style="color: #222;">${fecha}</strong></div>
        </div>
        ${clientRows}
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
                <tr style="background: #1a1a2e; color: #d4af37;">
                    <th style="padding: 10px 12px; text-align: left; font-size: 0.85rem; font-weight: 600;">Producto</th>
                    <th style="padding: 10px 12px; text-align: center; font-size: 0.85rem; font-weight: 600;">Ref.</th>
                    <th style="padding: 10px 12px; text-align: center; font-size: 0.85rem; font-weight: 600;">Cant.</th>
                    <th style="padding: 10px 12px; text-align: right; font-size: 0.85rem; font-weight: 600;">P. Unit.</th>
                    <th style="padding: 10px 12px; text-align: right; font-size: 0.85rem; font-weight: 600;">Subtotal</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
        <div style="text-align: right; padding: 14px 0; border-top: 2px solid #d4af37;">
            TOTAL A PAGAR: <span style="font-size: 1.4rem; font-weight: 700; color: #1a1a2e;">$${formatPrice(total)}</span>
        </div>
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #aaa; font-size: 0.78rem;">
            Este ticket es un comprobante de su selección. El pedido se confirmará vía WhatsApp.<br>
            Gracias por elegir <strong>BRILHO JOYAS</strong> ✨
        </div>
    </div>`;

    if (action === 'get_base64') {
        const element = document.createElement('div');
        element.innerHTML = ticketHTML;
        element.style.position = 'absolute';
        element.style.left = '-9999px';
        document.body.appendChild(element);
        
        return html2pdf().set({
            margin: [10, 10, 10, 10],
            filename: `Factura_${numTicket}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).from(element).outputPdf('datauristring').then(base64 => {
            document.body.removeChild(element);
            return base64; // Retorna el string base64 del PDF
        });
    }

    if (action === 'email') {
        let body = `Estimado(a) ${client.name || 'Cliente'},\n\nResumen de su pedido (${numTicket}):\n\n`;
        cartSnapshot.forEach(i => {
            let extras = '';
            if (i.selectedColor) extras += ` | Color: ${i.selectedColor}`;
            if (i.selectedSize) extras += ` | Talla: ${i.selectedSize}`;
            body += `- ${i.name} (Ref: ${i.ref || 'N/A'}${extras}) x${i.quantity} = $${formatPrice(parsePrice(i.price) * i.quantity)}\n`;
        });
        body += `\nTOTAL A PAGAR: $${formatPrice(total)}\n`;
        if (client.seller) body += `Vendedor: ${client.seller}\n`;
        body += `\nGracias por su compra. — BRILHO JOYAS`;
        window.location.href = `mailto:${emailAddress}?subject=${encodeURIComponent('Factura de Pedido ' + numTicket + ' - BRILHO JOYAS')}&body=${encodeURIComponent(body)}`;
    }

    // For 'auto' action (after checkout), skip print dialog — just save silently in background
    if (action === 'auto') return;

    // NATIVE PRINT DIALOG: the absolute most robust way to print or Save to PDF on all mobile and desktop devices
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(`<!DOCTYPE html><html><head><title>Factura_${numTicket}</title></head><body style="margin:0; background:white;">${ticketHTML}</body></html>`);
    iframe.contentWindow.document.close();
    
    // Add brief timeout to ensure HTML renders fully inside iframe
    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 2000);
    }, 500);
}

// -------- GESTIÓN DE COLORES, MEDIDAS Y VENDEDORES --------
let _lastCartSnapshot = []; // snapshot for PDF generation after checkout

function saveColors() { localStorage.setItem('brilho_colors', JSON.stringify(availableColors)); }
function saveSizes() { localStorage.setItem('brilho_sizes', JSON.stringify(availableSizes)); }
function saveSellers() { localStorage.setItem('brilho_sellers', JSON.stringify(availableSellers)); }

window.addColor = function() {
    const nameInput = document.getElementById('newColorName');
    const hexInput = document.getElementById('newColorHex');
    const name = nameInput.value.trim();
    const hex = hexInput.value;
    if (!name) { alert('Escribe un nombre para el color.'); return; }
    if (availableColors.find(c => c.name.toLowerCase() === name.toLowerCase())) {
        alert('Ya existe un color con ese nombre.'); return;
    }
    availableColors.push({ name, hex });
    saveColors();
    nameInput.value = '';
    renderManageLists();
}

window.removeColor = function(name) {
    availableColors = availableColors.filter(c => c.name !== name);
    saveColors();
    renderManageLists();
}

window.addSize = function() {
    const input = document.getElementById('newSizeName');
    const val = input.value.trim();
    if (!val) { alert('Escribe una medida.'); return; }
    if (availableSizes.includes(val)) { alert('Esa medida ya existe.'); return; }
    availableSizes.push(val);
    saveSizes();
    input.value = '';
    renderManageLists();
}

window.removeSize = function(val) {
    availableSizes = availableSizes.filter(s => s !== val);
    saveSizes();
    renderManageLists();
}

window.addSeller = function() {
    const input = document.getElementById('newSellerName');
    const val = input.value.trim();
    if (!val) { alert('Escribe un nombre de vendedor.'); return; }
    if (availableSellers.includes(val)) { alert('Ese vendedor ya existe.'); return; }
    availableSellers.push(val);
    saveSellers();
    input.value = '';
    renderManageLists();
    populateSellerDropdown();
}

window.removeSeller = function(val) {
    availableSellers = availableSellers.filter(s => s !== val);
    saveSellers();
    renderManageLists();
    populateSellerDropdown();
}

function renderManageLists() {
    // Colors
    const colorsList = document.getElementById('colorsList');
    if (colorsList) {
        colorsList.innerHTML = availableColors.map(c => `
            <div class="manage-tag">
                <span class="tag-color-dot" style="background:${c.hex};"></span>
                ${c.name}
                <button class="tag-remove" onclick="removeColor('${c.name.replace(/'/g, "\\'")}')">✕</button>
            </div>
        `).join('') || '<span style="color:var(--gray-500);font-size:0.85rem;">No hay colores configurados</span>';
    }
    
    // Sizes
    const sizesList = document.getElementById('sizesList');
    if (sizesList) {
        sizesList.innerHTML = availableSizes.map(s => `
            <div class="manage-tag">
                💍 ${s}
                <button class="tag-remove" onclick="removeSize('${s}')">✕</button>
            </div>
        `).join('') || '<span style="color:var(--gray-500);font-size:0.85rem;">No hay medidas configuradas</span>';
    }
    
    // Sellers
    const sellersList = document.getElementById('sellersList');
    if (sellersList) {
        sellersList.innerHTML = availableSellers.map(s => `
            <div class="manage-tag">
                👤 ${s}
                <button class="tag-remove" onclick="removeSeller('${s.replace(/'/g, "\\'")}')">✕</button>
            </div>
        `).join('') || '<span style="color:var(--gray-500);font-size:0.85rem;">No hay vendedores configurados</span>';
    }
}

function populateSellerDropdown() {
    const select = document.getElementById('custSeller');
    if (!select) return;
    select.innerHTML = '<option value="">-- Seleccionar Vendedor --</option>' +
        availableSellers.map(s => `<option value="${s}">${s}</option>`).join('');
}

window.switchAdminTab = function(tabId, btn) {
    document.querySelectorAll('.admin-tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    btn.classList.add('active');
}

function initManagement() {
    renderManageLists();
    populateSellerDropdown();
}

